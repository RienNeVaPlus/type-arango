import {collections, isActive, config, logger} from "../index";
import {concatUnique, db, removeUndefined, toArray} from '../utils';
import {
	CreateCollectionOptions,
	FieldMetadata,
	FieldRoles,
	IndexMetadata,
	Metadata,
	MetadataId,
	MetadataTypes,
	Roles,
	RouteMetadata,
	SchemaStructure,
	StructureValue
} from '../types';
import {getRouteForCollection, Route} from ".";
import * as Joi from 'joi';
import {Schema, SchemaMap} from 'joi';
import {CannotRedeclareFieldError} from '../errors';

export type RoleTypes = 'creators' | 'readers' | 'updaters' | 'deleters';

export interface CollectionRoles {
	creators: Roles;
	readers: Roles;
	updaters: Roles;
	deleters: Roles;
	fields: FieldRoles;
}

/**
 * Creates a new Collection for a decorated class
 */
export function createFromContainer(someClass: any): Collection {
	let c = new Collection(someClass);
	collections.push(c);
	return c;
}

/**
 * Returns the respective collection instance for a decorated class
 */
export function getCollectionForContainer(someClass: any): Collection {
	let col = collections.find(c => someClass === c.prototype || someClass.prototype instanceof c.prototype);
	if(col) return col;
	return createFromContainer(someClass);
}

/**
 * Collections represent tables in ArangoDB
 */
export class Collection {
	public name: string;
	public documentName: string;
	public completed: boolean = false;
	public opt?: CreateCollectionOptions;
	public schema: SchemaStructure = {};
	public joi?: Schema;
	public routes: Route[] = [];
	public roles: CollectionRoles = {
		creators: [],
		readers: [],
		updaters: [],
		deleters: [],
		fields: {reader:{},writer:{}}
	};

	private metadata: Metadata<MetadataTypes>[] = [];

	/**
	 * Returns a valid collection name
	 */
	static toName(input: string){
		input = input.endsWith('s') || !config.pluralizeCollectionName ? input : input + 's';
		return config.prefixCollectionName ? module.context.collectionName(input) : input;
	}

	/**
	 * Creates a new collection instance
	 */
	constructor(public prototype: any){
		this.documentName = prototype.name;
		this.name = Collection.toName(prototype.name.toLowerCase());
		prototype._typeArangoCollection = this;
	}

	public addRoles(key: RoleTypes, roles: Roles, onlyWhenEmpty: boolean = true){
		if(roles.length && onlyWhenEmpty && !this.roles[key].length)
			this.roles[key] = concatUnique(this.roles[key], roles);
	}

	public addMetadata(id: MetadataId, field: string, data: MetadataTypes): void {
		this.metadata.push({id,field,data});
	}

	private buildJoi(): Schema {
		let j: SchemaMap = {};
		for(let key of Object.keys(this.schema)){
			j[key] = this.schema[key].schema;
		}

		logger.debug('Build %s joi cache: %o', this.name, j);

		return Joi.object().keys(j);
	}

	private buildFieldRoles(): FieldRoles {
		let res: FieldRoles = {reader:{},writer:{}};
		let unauthorizedReader: string[] = [];
		let unauthorizedWriter: string[] = [];

		const fields = Object.keys(this.schema);
		for(let key of fields){
			const { authorized } = this.schema[key];
			if(!authorized){
				unauthorizedReader.push(key);
				unauthorizedWriter.push(key);
				continue;
			}

			toArray(authorized.readers).forEach(role => res.reader[role] = concatUnique(res.reader[role], key));
			toArray(authorized.writers).forEach(role => res.writer[role] = concatUnique(res.writer[role], key));
		}

		Object.keys(res.reader).forEach(role =>
			res.reader[role] = concatUnique(res.reader[role], unauthorizedReader));
		Object.keys(res.writer).forEach(role =>
			res.writer[role] = concatUnique(res.writer[role], unauthorizedWriter));

		logger.debug('Build %s roles cache for fields %o', this.name, res);

		return res;
	}

	processMetadata(opt: CreateCollectionOptions = {}){
		if(isActive){
			let col = db._collection(this.name);
			if(!db._collection(this.name)){
				logger.info('Creating ArangoDB Collection "%s"', this.name);
				col = db._createDocumentCollection(this.name, opt);
			}
			// process decorator metadata
			for(let {id, field, data} of this.metadata){
				switch(id){
					case 'index':
						logger.debug('Ensuring ArangoDB index on %s.%s with %o', this.name, field, data);
						col.ensureIndex(data as IndexMetadata);
						break;
				}
			}
		}

		for(let {id,field,data} of this.metadata){
			switch(id){
				case 'field':
					if(this.completed) throw new CannotRedeclareFieldError(field, this.documentName);
					let obj: StructureValue = removeUndefined(Object.assign({field}, data as FieldMetadata));
					this.schema[field] = Object.assign(this.schema[field] || {field}, obj);
					logger.debug('Create field `%s.%s` with schema %o', this.name, field, obj);
					break;

				case 'route':
					const { method, opt } = data as RouteMetadata;
					getRouteForCollection(method, opt, this);
					break;
			}
		}

		this.metadata = [];
	}

	/**
	 * Complete setup
	 */
	complete(opt: CreateCollectionOptions = {}){
		if(opt.name) this.name = opt.name;
		this.opt = opt;
		this.processMetadata(opt);
		this.joi = this.buildJoi();
		this.roles.fields = this.buildFieldRoles();
		this.completed = true;
		logger.info('Completed collection "%s"', this.name);
	}
}