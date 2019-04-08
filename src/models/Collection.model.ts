import {collections, config, isActive, logger} from "../index";
import {concatUnique, db, removeUndefined} from '../utils';
import {
	CollectionField,
	CreateCollectionOptions,
	FieldMetadata,
	IndexMetadata,
	Metadata,
	MetadataId,
	MetadataTypes,
	RoleFields,
	RoleObject,
	Roles,
	RouteMetadata,
	SchemaStructure
} from '../types';
import {getRouteForCollection, Route} from ".";
import * as Joi from 'joi';
import {CannotRedeclareFieldError} from '../errors';

export type RoleTypes = 'creators' | 'readers' | 'updaters' | 'deleters';

export interface CollectionRoles {
	creators: Roles;
	readers: Roles;
	updaters: Roles;
	deleters: Roles;
	_all: Roles;
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
 * Finds a collection for a decorated class
 */
export function findCollectionForContainer(someClass: any): Collection | undefined {
	return collections.find(c => someClass === c.prototype || someClass.prototype instanceof c.prototype);
}

/**
 * Returns the respective collection instance for a decorated class
 */
export function getCollectionForContainer(someClass: any): Collection {
	let col = findCollectionForContainer(someClass);
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
	public routes: Route[] = [];
	public roles: CollectionRoles = {
		creators: [],
		readers: [],
		updaters: [],
		deleters: [],
		_all: []
	};
	public roleStripFields: RoleObject = {};
	public field: CollectionField = {};

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
		if(onlyWhenEmpty && this.roles[key].length) return;
		// if(roles.length && onlyWhenEmpty && !this.roles[key].length)
		this.roles[key] = concatUnique(this.roles[key], roles);
		this.roles._all = concatUnique(this.roles._all, roles);
	}

	public addMetadata(id: MetadataId, field: string, data: MetadataTypes): void {
		this.metadata.push({id,field,data});
	}

	get joi(){
		return Joi.object(this.schema);
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
					let { schema, metadata, roles } = data as FieldMetadata;
					if(roles) {
						if(config.addFieldWritersToFieldReaders && roles.writers){
							roles.readers = concatUnique(roles.readers, roles.writers);
						}
						this.roles._all = concatUnique(this.roles._all, roles.readers, roles.writers);
					}
					this.schema[field] = schema;
					this.field[field] = removeUndefined({field,roles,metadata});

					logger.debug('Create field `%s.%s`', this.name, field);
					break;

				case 'route':
					const { method, opt } = data as RouteMetadata;
					getRouteForCollection(method, opt, this);
					break;
			}
		}

		this.buildFieldRoles();

		this.metadata = [];
	}

	/**
	 * Builds an array of fields that can't be read or written for every role used in the collection
	 * roleStripFields = {user:{read:[],write:['readOnlyField']}
	 */
	buildFieldRoles(){
		logger.debug('Building %s roles cache', this.name);

		const fields = Object.values(this.field);
		// every role of the entity
		for(let role of this.roles._all){
			let roles: RoleFields = {read:[],write:[]};

			// every field of the entity
			for(let field of fields){
				if(!field.roles) continue;
				const { roles: {readers,writers} } = field;
				if(readers && !readers.includes(role)) roles.read = concatUnique(roles.read, field.field);
				if(writers && !writers.includes(role)) roles.write = concatUnique(roles.write, field.field);
			}
			this.roleStripFields[role] = roles;
		}
	}

	/**
	 * Complete setup
	 */
	complete(opt: CreateCollectionOptions = {}){
		if(opt.name) this.name = opt.name;
		this.opt = opt;

		this.processMetadata(opt);

		this.completed = true;
		logger.info('Completed collection "%s"', this.name);
	}
}