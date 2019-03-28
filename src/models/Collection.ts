import {collections, opt, routes} from "../index";
import {db} from '@arangodb';
import {FieldMetadata, IndexMetadata, Metadata, MetadataId, MetadataTypes, Schema, SchemaValue} from './types';
import {RouteMethod, TypeCreateCollectionOptions} from "../decorators/types";
import {removeUndefined} from '../utils';
import {Route, RouteOptions} from ".";
import joi, {SchemaMap} from 'joi';

export function createFromContainer(someClass: Collection): Collection {
	let c = new Collection(someClass);
	collections.push(c);
	return c;
}

export function getFromContainer(someClass: any): Collection {
	let col = collections.find(c => someClass === c.prototype);
	if(col) return col;
	return createFromContainer(someClass);
}

export function typeToJoi(type: any){
	let j;
	switch(type){
		case String: j = joi.string(); break;
		case Number: j = joi.number(); break;
		case Boolean: j = joi.boolean(); break;
	}
	return j;
}

/**
 * Collections represent tables in ArangoDB
 */
export class Collection {
	public name: string;
	public documentName: string;
	public schema: Schema = {};

	private metadata: Metadata<MetadataTypes>[] = [];

	/**
	 * Returns a valid collection name
	 */
	static toName(input: string){
		input = input.endsWith('s') || !opt.pluralizeCollectionName ? input : input + 's';
		return opt.prefixCollectionName ? module.context.collectionName(input) : input;
	}

	/**
	 * Creates a new collection instance
	 */
	constructor(public prototype: Collection){
		this.documentName = prototype.name;
		this.name = Collection.toName(prototype.name.toLowerCase());
	}

	addMetadata(id: MetadataId, field: string, data: MetadataTypes): void {
		this.metadata.push({id,field,data});
	}

	addRoute(method: RouteMethod, opt: RouteOptions){
		routes.push(new Route(method, opt, this));
	}

	get joi(){
		let j: SchemaMap = {};
		for(let key of Object.keys(this.schema)){
			let v = typeToJoi(this.schema[key].type);
			if(v) j[key] = v;
		}

		return joi.object().keys(j)
	}


	/**
	 * Complete setup
	 */
	complete(opt: TypeCreateCollectionOptions){
		if(opt.name) this.name = opt.name;
		// if(roles) this.roles = roles;

		let col = db._collection(this.name);
		if(!db._collection(this.name)){
			col = db._createDocumentCollection(this.name, opt);
		}

		// process decorator metadata
		for(let {id,field,data} of this.metadata){
			switch(id){
				case 'field':
					let obj: SchemaValue = Object.assign({field}, data as FieldMetadata);
					this.schema[field] = Object.assign(this.schema[field] || {field}, removeUndefined(obj));
					break;

				case 'index':
					col.ensureIndex(data as IndexMetadata);
					break;
			}
		}
	}
}