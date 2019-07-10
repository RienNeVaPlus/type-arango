import {collections, config, Entities, isActive, logger} from "../index";
import {Document, getDocumentForContainer, Route as RouteModel, Scalar} from './index';
import {argumentResolve, concatUnique, db, enjoi, isObject, queryBuilder} from '../utils';
import {
	CreateCollectionOptions,
	DecoratorIds,
	DecoratorStorage,
	QueryOpt,
	RoleObject,
	Roles,
	RouteOpt,
	RoutePathParam,
	SchemaStructure
} from '../types';
import {getRouteForCollection} from ".";
import * as Joi from 'joi';

export type RoleTypes = 'creators' | 'readers' | 'updaters' | 'deleters';

export interface CollectionRoles {
	creators: Roles;
	readers: Roles;
	updaters: Roles;
	deleters: Roles;
}

/**
 * Creates a new Collection for a decorated class
 */
function createCollectionFromContainer(someClass: any): Collection {
	let c = new Collection(someClass);
	collections.push(c);
	return c;
}

/**
 * Finds a collection for a decorated class
 */
export function findCollectionForContainer(someClass: any): Collection | undefined {
	return collections.find(c => someClass === c.Class || someClass.prototype instanceof c.Class);
}

/**
 * Returns the respective collection instance for a decorated class
 */
export function getCollectionForContainer(someClass: any): Collection {
	let col = findCollectionForContainer(someClass);
	if(col) return col;
	return createCollectionFromContainer(someClass);
}

/**
 * Collections represent tables in ArangoDB
 */
export class Collection {
	public name: string;
	public db: ArangoDB.Collection;
	public completed: boolean = false;
	public opt?: CreateCollectionOptions;
	public schema: SchemaStructure = {};
	public routes: RouteModel[] = [];
	public roles: CollectionRoles = {
		creators: [],
		readers: [],
		updaters: [],
		deleters: []
	};
	public doc?: Document<any>;
	public roleStripAttributes: RoleObject = {};
	private decorator: DecoratorStorage = {};

	public get route(){
		let { name } = this;
		name = name.charAt(0).toLowerCase() + name.substr(1);

		if(config.dasherizeRoutes)
			name = name.replace(/[A-Z]/g, m => '-' + m.toLowerCase());

		return name;
	}

	/**
	 * Returns a valid collection name
	 */
	static toName(input: string){
		return config.prefixCollectionName ? module.context.collectionName(input) : input;
	}

	/**
	 * Creates a new collection instance
	 */
	constructor(public Class: new () => typeof Entities){
		this.name = Collection.toName(Class.name);
		this.db = isActive ? db._collection(this.name) : null;
	}

	public addRoles(key: RoleTypes, roles: Roles, onlyWhenEmpty: boolean = true){
		if(onlyWhenEmpty && this.roles[key].length) return;
		// if(roles.length && onlyWhenEmpty && !this.roles[key].length)
		this.roles[key] = concatUnique(this.roles[key], roles);
		if(this.doc) this.doc!.roles = concatUnique(this.doc!.roles, roles);
		else console.log('CANNOT ADD ROLES, DOCUMENT NOT READY');
	}

	// public addMetadata(id: MetadataId, attribute: string, data: MetadataTypes): void {
	// 	this.metadata.unshift({id,attribute,data});
	// }

	public decorate(decorator: DecoratorIds, data: any){
		this.decorator[decorator] = [...(this.decorator[decorator]||[]), {...data,decorator}];
	}

	get routeAuths(){
		return (this.decorator['Route.auth']||[]).map(d => d.authorizeFunction).reverse();
	}

	get routeRoles(){
		return (this.decorator['Route.roles']||[]).map(d => d.rolesFunction).reverse();
	}

	query(q: string | QueryOpt){
		if(typeof q === 'string'){
			return db._query(q);
		}

		if(!q.keep){
			q.unset = [];
			if(config.stripDocumentId) q.unset.push('_id');
			if(config.stripDocumentRev) q.unset.push('_rev');
			if(config.stripDocumentKey) q.unset.push('_key');
		}

		return db._query(queryBuilder(this.name, q));
	}

	finalize(){
		const { Collection, Route } = this.decorator;

		const { ofDocumentFunction, options = {} } = Collection![0];
		if(options.name) this.name = options.name;

		// const col = getCollectionForContainer(prototype);
		// col.decorate('Route.auth', {prototype,authorizeFunction})
		const doc = this.doc = getDocumentForContainer(argumentResolve(ofDocumentFunction));
		doc.col = this;

		if(isActive){
			// create collection
			if(!this.db){
				logger.info('Creating ArangoDB Collection "%s"', this.name);
				this.db = db._createDocumentCollection(this.name, options || {});
			}

			// create indices
			for(let {options} of doc.indexes!){
				this.db.ensureIndex(options);
			}
		}

		if(Route) for(let {
			prototype, attribute, method, pathOrRolesOrFunctionOrOptions, schemaOrRolesOrSummaryOrFunction,
			rolesOrSchemaOrSummaryOrFunction, summaryOrSchemaOrRolesOrFunction, options
		} of Route){
			const a: any = argumentResolve(pathOrRolesOrFunctionOrOptions);
			let opt: RouteOpt = Object.assign({
					queryParams: []
				},
				typeof a === 'string' ? {path:a} : Array.isArray(a)  ? {roles:a} : a || {}
			);

			let schema;

			// allow options for schema param
			if(isObject(schemaOrRolesOrSummaryOrFunction)){
				opt = Object.assign(schemaOrRolesOrSummaryOrFunction, opt);
			} else {
				schema = argumentResolve(schemaOrRolesOrSummaryOrFunction, (inp: any) => enjoi(inp, 'required'), Joi);
				if(schema instanceof Array){
					opt.roles = schema;
				} else if(typeof schema === 'string'){
					opt.summary = schema;
				} else if(typeof schema === 'object' && schema){

				} else schema = null;
			}

			// allow options for roles param
			if(isObject(rolesOrSchemaOrSummaryOrFunction)){
				opt = Object.assign(rolesOrSchemaOrSummaryOrFunction, opt);
			} else {
				let roles = argumentResolve(rolesOrSchemaOrSummaryOrFunction, (inp: any) => enjoi(inp, 'required'), Joi);

				if(roles instanceof Array){
					opt.roles = roles;
				} else if(typeof roles === 'string'){
					opt.summary = roles;
				} else if(typeof roles === 'object' && roles) {
					schema = roles;
				}
			}

			// allow options for summary param
			if(isObject(summaryOrSchemaOrRolesOrFunction)){
				opt = Object.assign(summaryOrSchemaOrRolesOrFunction, opt);
			} else {
				let summary = argumentResolve(summaryOrSchemaOrRolesOrFunction, (inp: any) => enjoi(inp, 'required'), Joi);
				if(summary instanceof Array){
					opt.roles = summary;
				} else if(typeof summary === 'string'){
					opt.summary = summary;
				} else if(typeof summary === 'object' && summary) {
					schema = summary;
				}
			}

			if(options)
				opt = Object.assign(options, opt);

			if(opt.path !== undefined) {
				opt = RouteModel.parsePath(opt, this.route);
			}

			if(schema) {
				if(schema.isJoi){}
				else {
					// support anonymous object syntax (joi => ({my:'object'}))
					schema = enjoi(schema) as typeof Joi;
				}

				// treat schema as queryParam or pathParam
				if(schema._type === 'object'){
					// allow optional request body but default to required()
					schema = schema._flags.presence === 'optional' ? schema : schema.required();

					// init params
					opt.pathParams = opt.pathParams || [];
					opt.queryParams = opt.queryParams || [];

					// loop schema keys
					for(const attr of schema._inner.children){
						// attributes with a default value are optional
						if(attr.schema._flags.default){
							attr.schema._flags.presence = 'optional';
						}

						// check schema attr in pathParams
						if(opt.pathParams.find(p => p[0] === attr.key)){
							// override pathParam schema with route schema in order to specify more details
							opt.pathParams = opt.pathParams.map(p => p[0] === attr.key ? [p[0], attr.schema, p[2]] as RoutePathParam : p);
							// remove attr from schema
							schema._inner.children = schema._inner.children.filter((a: any) => a.key !== attr.key);
							continue;
						}

						if(method === 'get'){
							const isRequired = attr.schema._flags.presence === 'required';
							opt.queryParams = opt.queryParams.concat([[attr.key,
								attr.schema, Scalar.iconRequired(isRequired) + ' ' + (isRequired
										? '**Required'
										: '**Optional'
								) + ` query parameter**  \`[ ${attr.key}: ${attr.schema._type} ]\`
				　 \`Example: ?${attr.key}=${attr.schema._type}\``
							]]);
						}
						// else {
						// 	opt.body = [schema];
						// }
					}

					if(method !== 'get'){
						opt.body = [schema];
					}
				}
			}

			// is MethodDecorator, replace callback with method
			if(attribute) {
				opt.handler = prototype[attribute];
				opt.handlerName = attribute;
			}

			getRouteForCollection(method, opt, this);
		}

		this.completed = true;
		// this.complete();
		logger.info('Completed collection "%s"', this.name);
	}
}