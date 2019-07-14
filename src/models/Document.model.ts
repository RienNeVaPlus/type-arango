import {
	DecoratorIds,
	DecoratorStorage,
	DocumentAttribute,
	DocumentData,
	QueryFilter,
	QueryOpt,
	Relation,
	RelationStructure,
	RelationType,
	RoleAttributes,
	RoleObject,
	SchemaStructure,
	DocumentOptions, AttributeObject
} from '../types'
import {config, documents, Entities, Entity, logger} from '../index'
import {argumentResolve, concatUnique, enjoi, removeUndefined, toJoi} from '../utils'
import {MissingTypeError, RelationNotFoundError} from '../errors'
import {Collection} from './Collection.model'
import * as Joi from 'joi'

/**
 * Creates a new Document for a decorated class
 */
function createDocumentFromContainer<T=typeof Entity>(someClass: new() => T): Document<T> {
	let c = new Document(someClass);
	documents.push(c);
	return c;
}

/**
 * Finds a document instance for a decorated class
 */
export function findDocumentForContainer<T=typeof Entity>(someClass: new() => T): Document<T> | undefined {
	return documents.find(c => someClass === c.Class); // || someClass.prototype instanceof c.cls);
}

/**
 * Returns the respective document instance for a decorated class
 */
export function getDocumentForContainer<T=typeof Entity>(someClass: new() => T): Document<T> {
	let doc = findDocumentForContainer(someClass);
	if(doc) return doc;
	return createDocumentFromContainer(someClass);
}

function reduceMap(arg: any, doc: DocumentData, map: DocumentMap){
	if(doc[map[0]] === undefined) return doc;
	doc[map[0]] = map[1](doc[map[0]], arg);
	return doc;
}

type DocumentMap = [string, (val: any, arg: any) => any];

export class Document<T=any> {
	public col?: Collection;
	public name: string;
	public options: DocumentOptions = {};
	public attribute: DocumentAttribute = {
		_id: {attribute: '_id', metadata: String, schema: toJoi(String)},
		_key: {attribute:'_key', metadata: String, schema: toJoi(String)}
	};
	public schema: SchemaStructure = {};
	public relation: RelationStructure<Document<any>> = {};
	public roles: string[] = ['guest'];
	public roleStripAttributes: RoleObject = {};
	private decorator: DecoratorStorage = {Index:[]};
	private forClientMap: DocumentMap[] = [];
	private fromClientMap: DocumentMap[] = [];

	constructor(public Class: new() => T){
		this.name = Class.name;
	}

	public decorate(decorator: DecoratorIds, data: any){
		this.decorator[decorator] = [...(this.decorator[decorator]||[]), {...data,decorator}];
	}

	get attributeIdentifierObject(){
		let o: DocumentData = {};
		Object.keys(this.attribute).forEach(a => o[a] = a);
		return o;
	}

	get indexes(){
		return this.decorator.Index;
	}

	get joi(){
		return Joi.object(this.schema);
	}

	public forClient(doc: DocumentData, arg: any){
		const { forClient } = this.options;
		doc = this.forClientMap.reduce(reduceMap.bind(null, arg), doc);
		return forClient ? forClient(doc, arg) : doc;
	}

	public fromClient(doc: DocumentData, arg: any){
		const { fromClient } = this.options;
		doc = this.fromClientMap.reduce(reduceMap.bind(null, arg), doc);
		return fromClient ? fromClient(doc, arg) : doc;
	}

	public resolveRelation(rel: Relation, filter: QueryFilter, value: any, set?: typeof Entity | null | string[]) {
		const entities = rel.document.col!.Class as typeof Entities;

		if(set === null)
			return value;

		let opt: QueryOpt = {filter};

		// attributes
		if(Array.isArray(set)){
			opt.keep = set;
		}

		switch(rel.type){
			default:
			case 'OneToOne': return entities.findOne(opt);
			case 'OneToMany': return entities.find(opt);
		}
	}

	/**
	 * Creates an array of attributes that can't be read or written for every role used in the collection
	 * this.roleStripAttributes = {user:{read:[],write:['readOnlyAttribute']}
	 */
	buildAttributeRoles(){
		logger.debug('Building %s attribute roles cache', this.name);

		const attributes = Object.values(this.attribute);
		// every role of the entity
		for(let role of this.roles){
			let roles: RoleAttributes = {read:[],write:[]};

			// every attribute of the entity
			for(let attr of attributes){
				if(!attr.roles) continue;
				const { roles: {readers,writers} } = attr;
				if(readers && !readers.includes(role)) roles.read = concatUnique(roles.read, attr.attribute);
				if(writers && !writers.includes(role)) roles.write = concatUnique(roles.write, attr.attribute);
			}
			this.roleStripAttributes[role] = roles;
		}
	}

	/**
	 * Setup attribute names for doc.attributeIdentifierObject before finalizing
	 */
	complete(){
		const { Document, Attribute } = this.decorator;

		if(Document){
			const { options } = Document![0];
			if(options){
				this.options = options;
			}
		}

		if(Attribute) for(let {attribute} of Attribute){
			if(attribute) this.attribute[attribute] = {attribute};
		}
	}

	finalize(){
		const { Attribute, OneToOne, OneToMany } = this.decorator;
		let metadata;

		// @Attribute
		if(Attribute) for(let {
			prototype, attribute, typeOrRequiredOrSchemaOrReadersOrFunction, readersArrayOrFunction, writersArrayOrFunction
		} of Attribute){
			metadata = attribute && Reflect.getMetadata('design:type', prototype, attribute);
			const joi = toJoi(metadata);

			// todo implement type param
			let schema = argumentResolve(typeOrRequiredOrSchemaOrReadersOrFunction, joi, enjoi) || joi;
			let readers = argumentResolve(readersArrayOrFunction);
			let writers = argumentResolve(writersArrayOrFunction);
			let roles;

			if(Array.isArray(schema)){
				writers = readers;
				readers = schema;
				schema = joi;
			}
			if(readers)
				roles = removeUndefined({readers:readers,writers:writers||config.requiredWriterRolesFallback});

			if(roles) {
				if(config.addAttributeWritersToReaders && roles.writers){
					roles.readers = concatUnique(roles.readers, roles.writers);
				}
				this.roles = concatUnique(this.roles, roles.readers, roles.writers);
			}
			if(attribute === 'auth'){
				// console.log('>>>',attribute);
				// console.log('readers', roles.readers);
				// console.log('writers', roles.writers);
				// console.log('>>>');
			}

			if(schema){
				this.schema[attribute!] = schema === true ? joi.required() : schema;
			}

			const data: AttributeObject = removeUndefined({attribute,roles,schema,metadata});

			if(metadata && metadata._typeArango){
				if(metadata.forClient) this.forClientMap.push([attribute!, metadata.forClient]);
				if(metadata.fromClient) this.fromClientMap.push([attribute!, metadata.fromClient]);
			}

			this.attribute[attribute!] = data;
			logger.debug('Created attribute `%s.%s`', this.name, attribute);
		}

		// create attribute roles
		this.buildAttributeRoles();

		// @OneToOne | @OneToMany
		if(OneToOne || OneToMany) for(let {
			decorator, prototype, attribute, type, relation
		} of (OneToOne||[]).concat(OneToMany||[])) {
			metadata = attribute && Reflect.getMetadata('design:type', prototype, attribute);

			if(!type && ((metadata && ['Array','Function'].includes(metadata.name)) || (!type && !metadata)))
				throw new MissingTypeError(this.name, attribute!);

			type = type ? argumentResolve(type) : metadata;

			const docName = this.name.toLowerCase();
			const relationDoc = getDocumentForContainer(type as any);
			const attrObj = relationDoc.attributeIdentifierObject;
			let relationAttr = argumentResolve(relation, attrObj);

			if(relation && !relationAttr)
				throw new RelationNotFoundError('OneToOne', this.name, relation);
			else if(!relationAttr)
				relationAttr = attrObj[docName] ? docName : '_key';

			this.relation[attribute!] = {type:decorator as RelationType, document:relationDoc, attribute:relationAttr};
			// this.setRelation('OneToOne', attribute!, relationDoc, relationAttr);
		}

		logger.info('Completed document "%s"', this.name);
	}
}