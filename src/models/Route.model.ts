import {Collection} from ".";
import {config, logger, RouteArgs, routes} from '../index';
import {concatUnique, db, pick, toArray} from "../utils";
import {RouteData, RouteMethod, RouteOpt, RouteResponse} from '../types';
import {Scalar} from './Scalar.model';
import * as Joi from 'joi'

const REGEX_PATH_PARAM: RegExp = /:+([^=/?&]+)[=]?([^/?&]+)?/gi;
const mime: string[] = ['application/json'];

export function getRouteForCollection(method: RouteMethod, opt: RouteOpt = {}, collection: Collection): Route {
	let route = routes.find(route => {
		return route.collection === collection
			&& route.method === method
			&& (route.path === opt.path || (!opt.path && !route.isCustom))
	});
	if(route){
		route.opt = Object.assign(opt, route.opt);
	} else {
		route = new Route(method, collection, opt);
		routes.push(route);
	}
	return route;
}

export class Route {
	path: string;
	isCustom: boolean;

	constructor(
		public method: RouteMethod,
		public collection: Collection,
		public opt: RouteOpt
	){
		this.isCustom = !!opt.path;
		this.path = opt.path || Route.defaultPath(collection, method);

		let { roles } = opt;

		// try to get global roles
		if(!roles){
			if(method === 'get') opt.roles = collection.roles.readers;
			else if(method === 'post') opt.roles = collection.roles.creators;
			else if(method === 'delete') opt.roles = collection.roles.deleters;
			else opt.roles = collection.roles.updaters;
		}
	}

	static defaultPath(collection: Collection, method: RouteMethod): string {
		let path: string = collection.name+'/:_key';

		// remove `_key` from path when `allowUserKeys` isn't set to false or `type` is set to `autoincrement`
		if(method === 'post'){
			const keyOptions = collection.opt && collection.opt.keyOptions;
			if(keyOptions && (keyOptions.allowUserKeys !== false || keyOptions.type === 'autoincrement'))
				path = collection.name;
		}

		return path;
	}

	static parsePath(opt: RouteOpt, collectionName?: string): RouteOpt {
		let { path } = opt;
		if(!path) return opt;

		logger.debug('Parsing route path: %s',path);
		path = path.startsWith('/') ? path.substr(1) : path;

		if(collectionName){
			// paths starting with ! aren't bound to the current scope
			if(path.startsWith('!'))
				path = path.substr(1);
			else if(!path.startsWith(collectionName)){
				path = collectionName+'/'+opt.path;
			}
		}

		const query = path.includes('?') ? path.substr(path.indexOf('?') + 1) : '';
		path = opt.path = query ? path.substr(0, path.length - query.length - 1) : path;

		// pathParams
		let str = path;
		let match;
		while((match = REGEX_PATH_PARAM.exec(str)) !== null) {
			const scalar = new Scalar(match[2], match[1]);
			scalar.isRequired = true;
			opt.path = opt.path.replace('='+match[2],'');
			opt.pathParams = toArray(opt.pathParams).concat([[
				scalar.name, scalar.joi, scalar.requiredIcon + ' ' + (scalar.isRequired
						? '**Required'
						: '**Optional'
				) + ` path parameter**  \`[ ${scalar.name}: ${scalar} ]\`
				　 \`Example: ${scalar.path}\``
			]]);
		}
		if(opt.queryParams) logger.debug('Added `pathParams` %o',opt.queryParams);

		// queryParams
		query.split('&').filter(f => f).forEach(part => {
			const scalar = new Scalar(part);
			opt.queryParams = toArray(opt.queryParams).concat([[
				scalar.name, scalar.joi, scalar.requiredIcon + ' ' + (scalar.isRequired
					? '**Required'
					: '**Optional'
				) + ` query parameter**  \`[ ${scalar.name}: ${scalar} ]\`
				　 \`Example: ${toArray(opt.queryParams).length?'&':'?'}${scalar.query}\``
			]]);
		});
		if(opt.queryParams) logger.debug('Added `queryParams` %o',opt.queryParams);

		return opt;
	}

	setup(router: Foxx.Router): Foxx.Endpoint {
		const { isCustom, method, path, collection, opt } = this;
		let {
			response = {status:'ok', schema:collection.joi, mime} as RouteResponse,
			errors = [],
			pathParams = [],
			queryParams = [],
			body,
			roles,
			summary = '',
			description = '',
			deprecated,
			tags,
			handler,
			handlerName
		} = opt as RouteOpt;

		// let body: RouteBody = opt.body;
		let name: string = collection.documentName.toLowerCase();

		if(!isCustom){
			pathParams = pathParams.concat([['_key', Joi.string(), '🆔 **Document identifier**']]);
		}

		// `select` query param
		if(['get','post','patch','put'].includes(method)){
			queryParams = [[
				'fields', Joi.string(),
				`✂️ **Comma separated list of fields to return in response**, _default is \`all\`_.
				  &nbsp; &nbsp; &nbsp; \`Values(${Object.keys(collection.schema).join('`, `')})\``
			]];
		}

		tags = tags || [collection.documentName];

		// 404
		if(['get','patch','delete'].includes(method))
			errors = [...errors, ['not found', `${collection.documentName} document not found in ${name} collection.`]];

		/**
		 *  Joi.required() is documented but ignored by Foxx:
		 *  https://docs.arangodb.com/devel/Manual/Foxx/Reference/Routers/Endpoints.html#body
		 */

		if(isCustom){
			queryParams = opt.queryParams || [];
		} else {
			switch(method){
				default:
				case 'get':
					summary = summary || `Returns ${collection.documentName}`;
					description = description || `Prints a **${name}** document of the collection **${collection.name}**.`;
					response.description = `A ${name} document of the ${collection.name} collection.`;
					break;

				case 'post':
					summary = summary || `Creates ${collection.documentName}`;
					description = description || `Creates and prints the new **${name}** document of the collection **${collection.name}**.`;
					body = body || [collection.joi!, `📑 **${collection.documentName} document to create**`];
					response.status = 'created';
					response.description = `The newly created ${name} document of the ${collection.name} collection.`;
					break;

				case 'patch':
					summary = summary || `Updates ${collection.documentName}`;
					if(!isCustom) description = description || `Updates and prints the new **${name}** document of the collection **${collection.name}**.`;
					body = body || [collection.joi!, `📑 **Partial ${name} document to update**`];
					response.description = `The updated ${name} document of the ${collection.name} collection.`;
					break;

				case 'put':
					summary = summary || `Replaces ${collection.documentName}`;
					description = description || `Replaces and prints the new **${name}** document of the collection **${collection.name}**.`;
					body = body || [collection.joi!, `📑 **${collection.documentName} document to replace**`];
					response.description = `The replaced ${name} document of the ${collection.name} collection.`;
					break;

				case 'delete':
					summary = summary || `Deletes ${collection.documentName}`;
					description = description || `Deletes a **${name}** document of the collection **${collection.name}**. Prints an empty body on success.`;
					response.status = 'no content';
					response.schema = null as unknown as Foxx.Schema; // ArangoDB Bug: null is not accepted
					response.description = 'No content.';
					queryParams = [];
					break;
			}
		}

		if(handler){
			const handlerId = collection.documentName+'.'+handlerName+'()';
			summary = opt.summary ? opt.summary : 'Calls '+handlerId;
			description = '**👁️️️️️ Handler:** `'+handlerId+'`<br/><br/>'
				+ (config.exposeRouteFunctionsToSwagger
					? '<pre>'+collection.documentName+'.'+(handler.toString())+'</pre><br/>' : '')
				+ description;
		}

		if(roles)
			description = `**🔐 Roles:** \`[${roles.join(', ')}]\`<br/><br/>`+description;

		if(body && !Array.isArray(body))
			body = [body, '📑 **Body schema**'];

		const routeData: RouteData = {
			router, method, name: collection.name, fieldRoles: collection.roles.fields, path,
			tags, summary, description, roles, response, errors, deprecated,
			body, pathParams, queryParams, handler
		};

		return Route.setup(routeData);
	}

	/**
	 * Setup route
	 */
	static setup({
			router,
		 	method,
			roles,
			fieldRoles,
			name,
			path,
			tags,
			response,
			errors,
			summary,
			description,
			deprecated,
			body,
			queryParams,
			pathParams,
		  handler
		}: RouteData
	): Foxx.Endpoint {
		const { info, debug, warn } = logger;
		info('- Setup %s %s', method.toUpperCase(), path);

		const route = router[method](
			path,
			(req: Foxx.Request, res: Foxx.Response) => {
				const { getUserRoles, getAuthorizedRoles, unauthorizedThrow } = config;

				info('[client %s] %s %s',req.remoteAddress, req.method.toUpperCase(),req.path);
				debug('Required roles %o', roles);

				// authorize by route/collection roles
				const userRoles = getUserRoles(req);
				debug('User roles %o', userRoles);

				const authorizedRoles = getAuthorizedRoles(userRoles, roles || []);
				info('Authorized roles %o', authorizedRoles);

				if(!authorizedRoles.length){
					warn('Unauthorized [client %s] %s %s', req.remoteAddress, req.method.toUpperCase(), req.path);
					return res.throw(unauthorizedThrow || 'unauthorized');
				}

				// collect read- & writable fields
				let fieldsRead: string[] = [], fieldsWrite: string[] = [];
				for(let role of userRoles){
					fieldsRead = concatUnique(fieldsRead, fieldRoles.reader[role]);
					fieldsWrite = concatUnique(fieldsWrite, fieldRoles.writer[role] || []);
				}

				// build route argument
				const requestedFields = req.param('fields') || null;
				const args: RouteArgs = {
					req, res,
					roles, userRoles, path, method,
					collection: db._collection(name),
					_key: req.param('_key') || '',
					requestedFields,
					send: Route.send.bind(null, req, res, fieldsRead, requestedFields),
					json: Route.json.bind(null, req, fieldsWrite),
					deprecated, tags, summary, description
				};

				debug('Call route handler with %o', args);

				// call handler
				return handler ? handler(args) : args.send(Route[method](args));
			}
		)
			.summary(summary).description(description);

		// add path params
		pathParams.forEach(a => route.pathParam(...a));

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
		if(body) route.body(body[0], mime, body[1]);
		// else route.body(null); // seens like a bug?

		// deprecate
		if(deprecated) route.deprecated(true);

		return route;
	}

	/**
	 * Send limited response
	 */
	static send(
		req: Foxx.Request,
		res: Foxx.Response,
		readFields: string[],
		requestedFields: string[],
		doc: ArangoDB.Document
	): Foxx.Response {
		if(config.stripDocumentKey && doc._key) delete doc._key;
		if(config.stripDocumentId && doc._id) delete doc._id;
		if(!['PATCH','PUT'].includes(req.method) && config.stripDocumentRev && doc._key)
			delete doc._rev;

		const resp = pick(requestedFields ? pick(doc, requestedFields) : doc, readFields);
		logger.debug('Send response %o', resp);

		return res.send(resp);
	}

	/**
	 * Returns a picked version containing only writable fields from `req.json()`
	 */
	static json(req: Foxx.Request, writeFields: string[]){
		const json = pick(req.json(), writeFields);
		logger.debug('Read input json() %o', json);
		return json;
	}

	/**
	 * Read document
	 */
	static get({_key, collection}: RouteArgs){
		logger.info('GET %s#%s', collection.name(),_key);
		return collection.document(_key);
	}

	/**
	 * Create document
	 */
	static post({json, res, _key, collection}: RouteArgs) {
		const body = json();
		_key = _key || body._key;
		body._key = _key;

		logger.info('POST %s#%s', collection.name(), _key||'n/a',body);

		if(_key && collection.exists(_key))
			return res.throw(409, 'Document already exists');

		let doc = _key ? Object.assign(body, {_key}) : body;
		let saved = collection.insert(doc);
		return Object.assign(doc, saved);
	}

	/**
	 * Update document
	 */
	static patch({json, res, _key, collection}: RouteArgs) {
		logger.info('PATCH %s#%s', collection.name(), _key);

		if(!collection.exists(_key))
			return res.throw(409, 'Document does not exist');

		// todo: implement param overwrite
		return <any>collection.update(_key, json(), {returnNew:true}).new;
	}

	/**
	 * Replace document
	 */
	static put({json, _key, collection}: RouteArgs) {
		logger.info('PUT %s#%ss', collection.name(), _key);

		// todo: implement param for create?
		return <any>collection.replace(_key, json(), {returnNew:true}).new;
	}

	/**
	 * Delete document
	 */
	static delete({res, _key, collection}: RouteArgs) {
		logger.info('DELETE %s#%s', collection.name(), _key);

		if(!collection.exists(_key))
			return res.throw(409, 'Document does not exist');

		collection.remove(_key!);
		return '';
	}
}