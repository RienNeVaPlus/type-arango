import {Joi} from '../joi'
import {
	AttributeObject,
	DecoratorId,
	DecoratorStorage,
	DocumentAttribute,
	DocumentData,
	DocumentOptions,
	EventMethod,
	EventType,
	QueryFilter,
	QueryOpt,
	RelationStructure,
	RelationType,
	RoleAttributes,
	RoleObject,
	Roles,
	SchemaStructure
} from '../types'
import {config, documents, Entities, Entity, logger, version} from '../index'
import {argumentResolve, concatUnique, enjoi, removeValues, toArray, toJoi, isObject} from '../utils'
import {MissingTypeError, RelationNotFoundError} from '../errors'
import {Collection} from './Collection.model'

const edgeAttributes = ['_from','_to'];

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
	return documents.find(c => someClass === c.Class);
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

const _id = Joi.string();
const _key = Joi.string();
const _from = Joi.string();
const _to = Joi.string();
const eventTypes: EventType[] = [
	'After.document', 'Before.document',
	'After.insert', 'Before.insert',
	'After.update', 'Before.update',
	'After.modify', 'Before.modify',
	'After.write', 'Before.write',
	'After.replace', 'Before.replace',
	'After.remove', 'Before.remove'
];
const eventNames: string[] = [
	'afterDocument', 'beforeDocument',
	'afterInsert', 'beforeInsert',
	'afterUpdate', 'beforeUpdate',
	'afterModify', 'beforeModify',
	'afterWrite', 'beforeWrite',
	'afterReplace', 'beforeReplace',
	'afterRemove', 'beforeRemove'
];

export class Document<T=any> {
	public col?: Collection;
	public name: string;
	public isEdge: boolean = false;
	public options: DocumentOptions = {};
	public attribute: DocumentAttribute = {
		_id: {attribute: '_id', metadata: String, schema: _id},
		_key: {attribute: '_key', metadata: String, schema: _key}
	};
	public schema: SchemaStructure = {_id, _key};
	public relation: RelationStructure<Document> = {};
	public roles: string[] = ['guest'];
	public roleStripAttributes: RoleObject = {};
	private decorator: DecoratorStorage = {Index:[]};
	private forClientMap: DocumentMap[] = [];
	private fromClientMap: DocumentMap[] = [];

	constructor(public Class: new() => T){
		this.name = Class.name;
	}

	public makeEdge(){
		this.isEdge = true;
		Object.assign(this.attribute, {_from,_to});
		Object.assign(this.schema, {_from,_to});
	}

	public decorate(decorator: DecoratorId, data: any){
		return this.decorator[decorator] = [...(this.decorator[decorator]||[]), {...data,decorator}];
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

	/**
	 * Emit before event
	 */
	public emitBefore(method: EventMethod, ...args: any[]){
		// PropertyDecorator
		toArray(this.decorator['Before.'+method+'.prop' as DecoratorId])
			.forEach(({attribute,resolver}) => {
				switch(method){
					case 'document': resolver(args[0], {_key:args[0], attribute, method}); break;
					case 'insert': args[0][attribute] = resolver(args[0][attribute], {json:args[0], attribute, method}); break;
					case 'update': args[0][attribute] = resolver(args[0][attribute], {_key:args[1], json:args[0], attribute, method}); break;
					case 'replace': args[0][attribute] = resolver(args[0][attribute], {_key:args[1], json:args[0], attribute, method}); break;
					case 'remove': resolver(args[0], {_key:args[0], attribute, method}); break;
				}
			});

		// ClassDecorator
		toArray(this.decorator['Before.'+method+'.class' as DecoratorId])
			.forEach(({resolver}) => {
				let v: false | true | undefined | ArangoDB.HttpStatus;
				switch(method){
					case 'document': v = resolver(args[0], {_key:args[0], method}); break;
					case 'insert': v = resolver(args[0], {json:args[0], method}); break;
					case 'update': v = resolver(args[0], {_key:args[1], json:args[0], method}); break;
					case 'replace': v = resolver(args[0], {_key:args[1], json:args[0], method}); break;
					case 'remove': v = resolver(args[0], {_key:args[0], method}); break;
				}

				// Cancel
				if(v === false || typeof v === 'string'){
					throw new Error(v || 'bad-request');
				}
				// Passive
				else if(v === true || v === undefined){ }
				// DocumentData
				else if(typeof args[0] === 'object') {
					args[0] = v;
				}
			});

		return args[0];
	}

	/**
	 * Emit after event
	 */
	public emitAfter(method: EventMethod, ...args: any[]){
		// PropertyDecorator
		toArray(this.decorator['After.'+method+'.prop' as DecoratorId])
			.forEach(({attribute,resolver}) => {
				switch(method){
					case 'document': args[0][attribute] = resolver(args[0][attribute], {_key:args[1], document:args[0], attribute, method});	break;
					case 'insert': args[0][attribute] = resolver(args[0][attribute], {_key:args[1], document:args[0], attribute, method}); break;
					case 'update': args[0][attribute] = resolver(args[0][attribute], {_key:args[1], document:args[0], attribute, method}); break;
					case 'replace': args[0][attribute] = resolver(args[0][attribute], {_key:args[1], document:args[0], attribute, method}); break;
					case 'remove': resolver(args[0], {_key:args[0], attribute, method}); break;
				}
			});

		// ClassDecorator
		toArray(this.decorator['After.'+method+'.class' as DecoratorId])
			.forEach(({resolver}) => {
				let v: false | true | undefined | ArangoDB.HttpStatus;
				switch(method){
					case 'document': v = resolver(args[0], {_key:args[0], method}); break;
					case 'insert': v = resolver(args[0], {_key:args[0]._key, document:args[0], method}); break;
					case 'update': v = resolver(args[1], {_key:args[1], document:args[0], method}); break;
					case 'replace': v = resolver(args[1], {_key:args[1], document:args[0], method}); break;
					case 'remove': v = resolver(args[0], {_key:args[0], method}); break;
				}

				// Cancel
				if(v === false || typeof v === 'string'){
					throw new Error(v || 'bad-request');
				}
				// Passive
				else if(v === true || v === undefined){ }
				// DocumentData
				else if(typeof args[0] === 'object') {
					args[0] = v;
				}
			});

		return args[0];
	}

	/**
	 * Resolves one or more related entities
	 */
	resolveRelation(data: DocumentData | Entity, attribute: string, arg?: string[]){
		const rel = this.relation[attribute];
		let filter: QueryFilter = {};
		let merge: any = null

		// related document is an edge, use CollectionName/ID
		if(rel.document.isEdge && edgeAttributes.includes(rel.attribute)){
			filter[rel.attribute] = this.col!.name + '/' + data._key;
		} else {
			if(data._key)
				filter[rel.attribute] = ['HAS', data._key];
		}

		// relation key/s stored in document
		let ref = data[attribute];
		if(ref){
      if(isObject(ref))
				throw new Error(`Invalid relation value of "${rel.document.name}.${rel.attribute}": ${JSON.stringify(ref)}`);

      // remove CollectionName/ from relation id
			if(this.isEdge){
				if(Array.isArray(ref))
					ref = ref.map(r => r.replace(rel.document.col!.name+'/', ''));
				else
          ref = ref.replace(rel.document.col!.name+'/', '');
      }

			// support tuples with key and value [[KEY, VALUE],...]
      if(Array.isArray(ref[0])){
        merge = [...ref]
        ref = ref.map((r: any) => r[0])
      }

			filter = {_key:ref};
    }

    if(!Object.keys(filter).length)
			throw new Error(`Cannot resolve relation of "${rel.document.name}.${rel.attribute}": empty filter`);

		const entities = rel.document.col!.Class as typeof Entities;

		if(arg === null)
			return data[attribute];

		let opt: QueryOpt = {filter};

    // attributes
		if(Array.isArray(arg)){
			opt.keep = arg;
		}

		let res: any;

		// retrieve document/s
		switch(rel.type){
			default: return null;
			case 'OneToOne': res = entities.findOne(opt); break;
			case 'OneToMany': res = entities.find(opt); break;
		}

		// merge values back into result
		if(merge)
		  res = res.map((res: any) => ({...res, _value: merge.find((r: any) => r[0] === res._key)[1] }))

    return res
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
	 * Creates arrays of document attributes that can be read or written
	 */
	stripAttributeList(providedRoles: Roles, method: 'read' | 'write'){
		// collect attributes into temp object {key:count}
		let attributes: any = {}, sum: number = 0;
		for(let role of providedRoles){
			if(this.roleStripAttributes[role]){
				sum++;
				for(let r of this.roleStripAttributes[role][method]){
					attributes[r] = (attributes[r] || 0) + 1;
				}
			}
		}

		let stripAttributes: string[] = [];
		Object.keys(attributes).forEach(k => attributes[k] === sum && stripAttributes.push(k));

		return stripAttributes;
	}

	/**
	 * Setup attribute names for doc.attributeIdentifierObject before finalizing
	 */
	complete(){
		const { Authorized, Attribute } = this.decorator;

		if(Attribute) for(let {attribute} of [...Authorized||[], ...Attribute]){
			if(attribute) this.attribute[attribute] = {attribute};
		}
	}

	finalize(){
		const { Authorized, OneToOne, OneToMany } = this.decorator;
		let metadata: any;

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
				throw new RelationNotFoundError(decorator as any, this.name, relation);
			else if(!relationAttr)
				relationAttr = attrObj[docName] ? docName : '_key';

			this.relation[attribute!] = {type:decorator as RelationType, document:relationDoc, attribute:relationAttr};
		}

		// @Authorized
		if(Authorized) for(let o of Authorized){
			const A = this.decorator.Attribute || [];
			let a = (A || []).find(a => a.attribute === o.attribute);
			if(!a) a = this.decorate('Attribute', o).find(attr => attr.attribute === o.attribute);
			else {
				a.readersArrayOrFunction = o.readersArrayOrFunction;
				a.writersArrayOrFunction = o.writersArrayOrFunction;
			}
		}

		const { Attribute } = this.decorator;

		// @Attribute
		if(Attribute) for(let {
			prototype, attribute, typeOrRequiredOrSchemaOrReadersOrFunction, readersArrayOrFunction, writersArrayOrFunction
		} of Attribute){
			metadata = Reflect.getMetadata('design:type', prototype, attribute!);
			const rel = this.relation[attribute!];
			let joi;

			if(!rel) joi = toJoi(metadata);
			else switch(rel.type){
				case 'OneToOne': joi = rel.document.attribute[rel.attribute].schema || Joi.string(); break;
				case 'OneToMany': joi = Joi.array().items(rel.document.attribute[rel.attribute!].schema || Joi.string()); break;
				default: joi = toJoi(metadata); break;
			}

			// if(!metadata)
			// 	throw new Error('Invalid design:type for "'+this.name+'.'+attribute+'"');

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
				roles = removeValues({readers:readers,writers:writers||config.requiredWriterRolesFallback}, undefined);

			if(roles) {
				if(config.addAttributeWritersToReaders && roles.writers){
					roles.readers = concatUnique(roles.readers, writers||[]);
				}
				this.roles = concatUnique(this.roles, roles.readers, roles.writers);
			}

			if(schema){
				this.schema[attribute!] = schema === true ? joi.required() : schema;
			}

			const data: AttributeObject = removeValues({attribute,roles,schema,metadata}, undefined);

			if(metadata && metadata._typeArango){
				if(version < metadata._typeArango){
					logger.error(`Type.${metadata.name} requires type-arango v${metadata._typeArango}`);
				} else {
					if(metadata.forClient) this.forClientMap.push([attribute!, metadata.forClient]);
					if(metadata.fromClient) this.fromClientMap.push([attribute!, metadata.fromClient]);
					eventTypes.forEach(name => {
						const m = metadata[eventNames[eventTypes.indexOf(name)]];
						if(!m) return;
						this.decorate(name+'.prop' as DecoratorId, {prototype,attribute,resolver:m})
					});
				}
			}

			this.attribute[attribute!] = data;
			logger.debug('Created attribute `%s.%s`', this.name, attribute);
		}

		// create attribute roles
		this.buildAttributeRoles();

		logger.info('Completed document "%s"', this.name);
	}
}