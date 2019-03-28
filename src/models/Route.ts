import {Collection} from ".";
import {RouteMethod} from "../decorators/types";
import {routes, opt} from '../index';
import {removeUndefined, filterKeys} from "../utils";
import {db} from '@arangodb';
import joi from 'joi';

let mime: string[] = ['application/json'];

export function createRoutes(router: Foxx.Router){
	routes.reverse().forEach(route => route.setup(router));
}

export interface RouteOptions {
	deprecated?: boolean,
	tags?: string[],
	summary?: string;
	description?: string;
}
type RouteStatus = number | ArangoDB.HttpStatus;

export type RouteError = [RouteStatus, string];
export type RouteQueryParam = [string, Foxx.Schema, string];

export interface RouteResponse {
	status: RouteStatus,
	schema: Foxx.Schema,
	mime: string[];
	description?: string;
}

export interface RouteData {
	router: Foxx.Router,
	method: RouteMethod,
	name: string,
	path: string,
	queryParams: RouteQueryParam[],
	response: RouteResponse,
	errors: RouteError[],
	body?: [Foxx.Schema, string[]],
	summary: string;
	description: string;
	deprecated?: boolean;
	tags?: string[]
}

export class Route {
	constructor(
		private method: RouteMethod,
		private opt: RouteOptions,
		private collection: Collection
	){}

	setup(router: Foxx.Router){
		const { method, collection, opt } = this;
		let { summary, description, deprecated, tags } = opt;

		let name = collection.documentName.toLowerCase();

		// queryParams
		let queryParams: RouteQueryParam[] = [];
		// `select` query param
		if(['get','post','patch','put'].includes(method)){
			queryParams = [[
				'keys', joi.string(),
				`List of keys to return in response, default is \`all fields\`.\nPossible values are: \`${Object.keys(collection.schema).join('`, `')}\``
			]];
		}

		tags = tags || [name];

		// responses
		let response: RouteResponse = {status:'ok', schema:collection.joi, mime};

		// errors
		let errors: RouteError[] = [];
		// 404
		if(['get','patch','delete'].includes(method))
			errors = [...errors, ['not found', `${collection.documentName} document not found in ${name} collection.`]];
		// todo: authorization

		// request body
		let body;
		if(['post','patch','put'].includes(method)) {
			/**
			 *  joi.required() is documented but ignored by Foxx:
			 *  https://docs.arangodb.com/devel/Manual/Foxx/Reference/Routers/Endpoints.html#body
			 */
			body = [collection.joi.required(), mime, `${collection.documentName} document to create`];
		}

		switch(method){
			default:
			case 'get':
				summary = summary || `Returns ${name}`;
				description = description || `Prints a **${name}** document of the collection **${collection.name}**.`;
				response.description = `A ${name} document of the ${collection.name} collection.`;
				break;

			case 'post':
				summary = summary || `Creates ${name}`;
				description = description || `Creates and prints the new **${name}** document of the collection **${collection.name}**.`;
				body = [collection.joi.required(), mime, `${collection.documentName} document to create`];
				response.status = 'created';
				response.description = `The newly created ${name} document of the ${collection.name} collection.`;
				break;

			case 'patch':
				summary = summary || `Updates ${name}`;
				description = description || `Updates and prints the new **${name}** document of the collection **${collection.name}**.`;
				body = [collection.joi.required(), mime, `Partial ${collection.documentName} document to update`];
				response.description = `The updated ${name} document of the ${collection.name} collection.`;
				break;

			case 'put':
				summary = summary || `Replaces ${name}`;
				description = description || `Replaces and prints the new **${name}** document of the collection **${collection.name}**.`;
				body = [collection.joi.required(), mime, `${collection.documentName} document to replace`];
				response.description = `The replaced ${name} document of the ${collection.name} collection.`;
				break;

			case 'delete':
				description = description || `Deletes a **${name}** document of the collection **${collection.name}**. Prints an empty body on success.`;
				summary = summary || `Deletes ${name}`;
				response.status = 'no content';
				response.schema = null as unknown as Foxx.Schema; // ArangoDB Bug: null is not accepted
				response.description = 'No content.';
				queryParams = [];
				break;
		}

		Route.setup(removeUndefined({
			router, method, path: collection.name+'/:_key', name:collection.name, tags, summary, description,
			response, errors, deprecated, body, queryParams
		}));
	}

	/**
	 * Setup route
	 */
	static setup({
			router,
		 	method,
			name,
			path,
			tags,
			response,
			errors,
			summary,
			description,
			deprecated,
			body,
			queryParams
		}: RouteData
	){
		const route = router[method](path, Route[method](name))
			.pathParam('_key', 'Document identifier')
			.summary(summary).description(description);

		// add query params
		queryParams.forEach(a => route.queryParam(...a));

		// add response information
		if(response){
			const { status, schema, mime, description } = response;
			route.response(status, schema, mime, description);
		}

		// add error information
		errors.forEach(a => route.response(...a));

		// add tags
		if(tags) route.tag(...tags);

		// add body
		if(body) route.body(...body);
		// else route.body(null); // bug

		// deprecate
		if(deprecated) route.deprecated(true);
	}

	static getDocument(collectionName: string, req: Foxx.Request){
		return db._collection(collectionName).document(req.param('_key'));
	}

	/**
	 * Send limited response
	 */
	static send(req: Foxx.Request, res: Foxx.Response, doc: ArangoDB.Document){
		if(opt.stripDocumentKey) delete doc._key;
		if(opt.stripDocumentId) delete doc._id;
		if(!['PATCH','PUT'].includes(req.method) && opt.stripDocumentRev) delete doc._rev;
		return res.send(filterKeys(doc, req.param('keys')));
	}

	/**
	 * Read document
	 */
	static get(name: string){
		return (req: Foxx.Request, res: Foxx.Response) => {
			Route.send(req, res, db._collection(name).document(req.param('_key')));
		}
	}

	/**
	 * Get collection & _key
	 * @param name
	 * @param req
	 */
	static prepare(name: string, req: Foxx.Request){
		return {
			collection: db._collection(name),
			_key: req.param('_key')
		};
	}

	/**
	 * Create document
	 */
	static post(name: string){
		return (req: Foxx.Request, res: Foxx.Response) => {
			const {collection,_key} = Route.prepare(name, req);

			if(collection.exists(_key))
				return res.throw(409, 'Document already exists');

			let doc = Object.assign(req.json(), {_key});
			let saved = collection.insert(doc);
			return Route.send(req, res, Object.assign(doc, saved));
		}
	}

	/**
	 * Update document
	 */
	static patch(name: string){
		return (req: Foxx.Request, res: Foxx.Response) => {
			const {collection,_key} = Route.prepare(name, req);

			if(!collection.exists(_key))
				return res.throw(409, 'Document does not exist');

			// todo: implement param overwrite
			return Route.send(req, res, <any>collection.update(_key, req.json(), {returnNew:true}).new);
		}
	}

	/**
	 * Replace document
	 */
	static put(name: string){
		return (req: Foxx.Request, res: Foxx.Response) => {
			const {collection,_key} = Route.prepare(name, req);

			// todo: implement param for create?
			return Route.send(req, res, <any>collection.replace(_key, req.json(), {returnNew:true}).new);
		}
	}

	/**
	 * Delete document
	 */
	static delete(name: string){
		return (req: Foxx.Request, res: Foxx.Response) => {
			const {collection,_key} = Route.prepare(name, req);

			if(!collection.exists(_key))
				return res.throw(409, 'Document does not exist');

			collection.remove(_key);
			return res.send('');
		}
	}
}