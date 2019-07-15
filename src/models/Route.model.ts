import {Collection} from '.'
import {config, logger, RouteArg, routes} from '../index'
import {db, joiDefaults, omit, pick, toArray, removeValues} from '../utils'
import {DocumentData, RouteData, RouteMethod, RouteOpt, RouteQueryParam, RouteResponse, RouteRolesArg, RouteAction} from '../types'
import {Scalar} from './Scalar.model'
import * as Joi from 'joi'

const {aql} = require('@arangodb');

const REGEX_PATH_PARAM: RegExp = /:+([^=/?&]+)[=]?([^/?&]+)?/gi;
const mime: string[] = ['application/json'];

export function getRouteForCollection(method: RouteMethod, opt: RouteOpt = {}, collection: Collection): Route {
	let route = routes.find(route => {
		return route.col === collection
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
		public col: Collection,
		public opt: RouteOpt
	){
		this.isCustom = !!opt.path;
		this.path = typeof opt.path === 'string' ? opt.path : Route.defaultPath(col, method);

		// is ClassDecorator, save roles to collection
		if(opt.roles && opt.roles.length) {
			if(method === 'post') col.addRoles('creators', opt.roles);
			else if(method === 'get') col.addRoles('readers', opt.roles);
			else if(method === 'delete') col.addRoles('deleters', opt.roles);
			else col.addRoles('updaters', opt.roles);
		}

		// try to read from collection roles
		if(!opt.roles){
			if(method === 'get') opt.roles = col.roles.readers;
			else if(method === 'post') opt.roles = col.roles.creators;
			else if(method === 'delete') opt.roles = col.roles.deleters;
			else opt.roles = col.roles.updaters;

			if(!opt.roles.length)
				opt.roles = opt.roles.concat(config.requiredRolesFallback||[]);
		}
	}

	static defaultPath(col: Collection, method: RouteMethod): string {
		let path: string = col.route+'/:_key';

		// remove `_key` from path when `allowUserKeys` isn't set to false or `type` is set to `autoincrement`
		if(method === 'post'){
			const keyOptions = col.opt && col.opt.keyOptions;
			if(keyOptions && (keyOptions.allowUserKeys !== false || keyOptions.type === 'autoincrement'))
				path = col.route;
		}

		return path;
	}

	static parsePath(opt: RouteOpt, collectionName?: string): RouteOpt {
		let { path } = opt;
		if(path === undefined) return opt;

		logger.debug('Parsing route path: %s',path);
		path = path.startsWith('/') ? path.substr(1) : path;

		if(collectionName){
			// paths starting with ! aren't bound to the current scope
			if(path.startsWith('!')){
				path = path.substr(1);
			}
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
		if(opt.queryParams) logger.debug('Added `pathParams` %o', opt.queryParams);

		// queryParams
		query.split('&').filter(f => f).forEach(part => {
			const scalar = new Scalar(part);
			opt.queryParams = toArray(opt.queryParams).concat([[
				scalar.name, scalar.joi, scalar.requiredIcon + ' ' + (scalar.isRequired
					? '**Required'
					: '**Optional'
				) + ` query parameter**  \`[ ${scalar.name}: ${scalar} ]\`
				　 \`Example: ?${scalar.query}\``
			]]);
		});
		if(opt.queryParams) logger.debug('Added `queryParams` %o',opt.queryParams);

		return opt;
	}

	setup(router: Foxx.Router): Foxx.Endpoint {
		const { isCustom, method, path, col, opt } = this;
		let {
			response = {status:'ok', schema:col.doc!.joi, mime} as RouteResponse,
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
		const name: string = col.doc!.name;

		if(!isCustom){
			pathParams = pathParams.concat([['_key', Joi.string(), '🆔 **Document identifier**']]);
		}

		// `select` query param
		if(['get','post','patch','put'].includes(method)){
			queryParams = [[
				'attributes', Joi.string(),
				`✂️ **Comma separated list of attributes to return in response**, _default is \`all\`_.
				  &nbsp; &nbsp; &nbsp; \`Values(${Object.keys(col.schema).join('`, `')})\``
			]];
		}

		tags = tags || [col.name];

		// 404
		if(['get','patch','delete'].includes(method))
			errors = [...errors, ['not found', `${name} document not found in ${col.name} collection.`]];

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
					summary = summary || `Returns ${name}`;
					description = description || `Prints a ${name} document of the collection **${col.name}**.`;
					response.description = `${name} document of the ${col.name} collection.`;
					break;

				case 'post':
					summary = summary || `Creates ${name}`;
					description = description || `Creates and prints the **${name}** document of the collection **${col.name}**.`;
					body = body || [col.doc!.joi, `📑 **${name}  document to create**`];
					response.status = 'created';
					response.description = `The newly created ${name} document of the ${col.name} collection.`;
					break;

				case 'patch':
					summary = summary || `Updates ${name}`;
					if(!isCustom) description = description || `Updates and prints the **${name}** document of the collection **${col.name}**.`;
					body = body || [col.doc!.joi, `📑 **Partial ${name} document to update**`];
					response.description = `The updated ${name} document of the ${col.name} collection.`;
					break;

				case 'put':
					summary = summary || `Replaces ${name}`;
					description = description || `Replaces and prints the **${name}** document of the collection **${col.name}**.`;
					body = body || [col.doc!.joi, `📑 **${name} document to replace**`];
					response.description = `The replaced ${name} document of the ${col.name} collection.`;
					break;

				case 'delete':
					summary = summary || `Deletes ${name}`;
					description = description || `Deletes a **${name}** document of the collection **${col.name}**. Prints an empty body on success.`;
					response.status = 'no content';
					response.schema = null as unknown as Foxx.Schema; // ArangoDB Bug: null is not accepted
					response.description = 'No content.';
					queryParams = [];
					break;
			}
		}

		if(handler){
			const handlerId = col.name+'.'+handlerName+'()';
			summary = opt.summary || 'Calls '+handlerId;
			description = '**👁️️️️️ Handler:** `'+handlerId+'`<br/><br/>'
				+ (config.exposeRouteFunctionsToSwagger
					? '<pre>'+col.name+'.'+(handler.toString())+'</pre><br/>' : '')
				+ description;
		}

		const { routeAuths, routeRoles } = col;
		if(roles || routeAuths.length || routeRoles.length){
			const rolesText = roles ? '['+(roles||[]).join(', ')+']' : null;
			description = '**🔐 Authorization:** `getAuthorizedRoles('+(routeRoles.length
					? '[...getUserRoles(), ...Route.roles'+(routeRoles.length>1?'['+routeRoles.length+']':'')+']'
					: 'getUserRoles()'
				)
				+ (rolesText?', '+rolesText:'')+') '
				+ (routeAuths.length?'&& Route.auth'+(routeAuths.length>1?'['+routeAuths.length+']':''):'')
				+ '`<br/><br/>'
				// + (roles ? '**👪 Roles:** `'+rolesText+'`<br/><br/>' : '')
				// + (routeAuths.length?'**🔑 Auth:** `'+(routeAuths.join(' && '))+'`<br/><br/>':'')
				+ description;
		}

		if(body && !Array.isArray(body))
			body = [body, '📑 **Body schema**'];

		// if(path === 'items/requestUploadUrl')
		// console.log('PATHPARAMS', path,pathParams);
		const routeData: RouteData = {
			router, method, name: col.name, path, roleStripAttributes: col.doc!.roleStripAttributes,
			doc: col.doc,
			tags, summary, description, roles, response, errors, deprecated,
			routeAuths: col.routeAuths, routeRoles: col.routeRoles,
			body, pathParams, queryParams, handler
		};

		return Route.setup(routeData);
	}

	/**
	 * Setup route
	 */
	static setup({
		doc,
		router,
		method,
		routeAuths,
		routeRoles,
		roles,
		roleStripAttributes,
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
		handler }: RouteData
	): Foxx.Endpoint {
		const { info, debug, warn } = logger;
		info('- Setup %s %s', method.toUpperCase(), path);

		const route = router[method](
			path,
			(req: Foxx.Request, res: Foxx.Response) => {
				const { getUserRoles, getAuthorizedRoles, throwForbidden } = config;

				info('[client %s] %s %s', req.remoteAddress, req.method.toUpperCase(),req.path);
				debug('Required roles %o', roles);

				// authorize by route/collection roles
				let userRoles = getUserRoles(req);
				let tmp = {doc:null};
				const _key = req.param('_key');
				const collection = db._collection(name);
				const args: RouteRolesArg = {
					req, res, roles, path, method, aql,
					_key,
					collection,
					document: Route.document.bind(null, collection, tmp, _key),
					query: Route.query.bind(null),
					session: Route.session.bind(null, req, res),
					requestedAttributes: req.param('attributes') || null,
					hasAuth: !!routeAuths.length,
					auth: Route.auth.bind(null, req, res, routeAuths),
					error: Route.error.bind(null, res)
				};
				if(routeRoles.length){
					userRoles = routeRoles.map(f => f(args) || []).reduce((c, n) => c.concat(n), userRoles);
				}
				debug('Provided roles %o', userRoles);

				const authorizedRoles = getAuthorizedRoles(userRoles, roles || []);
				info('Authorized roles %o', authorizedRoles);

				if(!authorizedRoles.length){
					warn('Forbidden [client %s] %s %s', req.remoteAddress, req.method.toUpperCase(), req.path);
					return res.throw(throwForbidden || 'forbidden');
				}

				// collect read- & writable attributes into temp object {key:count}
				let attributesRead: any = {}, attributesWrite: any = {}, sum: number = 0;
				for(let role of userRoles){
					if(roleStripAttributes[role]){
						sum++;
						for(let read of roleStripAttributes[role].read){
							attributesRead[read] = (attributesRead[read] || 0) + 1;
						}
						for(let write of roleStripAttributes[role].write){
							attributesWrite[write] = (attributesWrite[write] || 0) + 1;
						}
					}
				}
				// strip attributes when they are forbidden in all roles
				let stripAttributesRead: string[] = [], stripAttributesWrite: string[] = [];
				// const sum = userRoles.length;
				Object.keys(attributesRead).forEach(
					k => attributesRead[k] === sum && stripAttributesRead.push(k));
				Object.keys(attributesWrite).forEach(
					k => attributesWrite[k] === sum && stripAttributesWrite.push(k));

				// build route argument
				// const requestedAttributes = req.param('attributes') || null;
				const data: RouteArg = Object.assign(args, {
					req, res, userRoles,
					send: Route.send.bind(null, req, res, doc.forClient.bind(doc), stripAttributesRead, args.requestedAttributes!),
					json: Route.json.bind(null, req, res, doc.fromClient.bind(doc), body ? body[0] : null, stripAttributesWrite),
					deprecated, tags, summary, description
				});

				debug('Call route handler for %o %o', method.toUpperCase(), path);

				if(handler){
					const result = handler(data);
					return result ? data.send(result) : result;
				}
				return data.send(Route[method](data));
			}
		)
			.summary(summary).description(description);

		// add path params
		pathParams.forEach(a => route.pathParam(...a));

		// add query params
		queryParams.forEach((a: RouteQueryParam) => route.queryParam(...a));

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
		if(body){
			route.body(body[0], mime, body[1]);
		}
		// else route.body(null); // seems like a bug?

		// deprecate
		if(deprecated) route.deprecated(true);

		return route;
	}

	/**
	 * Get or set the session
	 */
	static session(req: Foxx.Request, res: Foxx.Response, dataOrEnforce?: Partial<Foxx.Session> | true): Foxx.Session {
		const enforce = dataOrEnforce === true;
		const data = dataOrEnforce && !enforce ? dataOrEnforce : null;

		// read
		if(!data || enforce){
			if(enforce && !req.session!.uid){
				res.throw(config.throwUnauthorized, {cause:new Error('Session invalid')});
			}
			return req.session!;
		}

		// write
		Object.keys(data).forEach((k: string) => (req.session as any)[k] = (data as any)[k]);
		return req.session!;
	}

	/**
	 * Request based document cache in order to avoid duplicate calls to collection.document
	 */
	static document(collection: ArangoDB.Collection, tmp: any, _key: string){
		return tmp.doc || (tmp.doc = collection.document(_key))
	}

	/**
	 * Authorizes a document by calling the Route.auth handlers
	 */
	static auth(
		req: Foxx.Request,
		res: Foxx.Response,
		authorizes: any[],
		document: DocumentData,
		method?: RouteMethod,
		action?: RouteAction,
		canThrow: boolean = true
	){
		if(!authorizes.length) return document;
		const args = {session:req.session, doc:document, document, method, action, req, res};
		let success = !(authorizes||[]).find(f => !f(args));
		if(!success){
			if(canThrow) res.throw(config.throwForbidden || 'forbidden');
			return false;
		}
		return document;
	}

	/**
	 * Execute a query
	 */
	static query(query: ArangoDB.Query, _options?: ArangoDB.QueryOptions){
		logger.debug('Query %o', query);
		return db._query.apply(db, arguments);
	}

	/**
	 * Returns a picked version containing only writable attributes from `req.json()`
	 */
	static json(
		req: Foxx.Request,
		res: Foxx.Response,
		fromClient: any,
		body: any,
		stripAttributes: string[],
		omitUnwritableAttributes: boolean = true
	){
		let json = req.json();

		// add joi defaults to result, this should've been done by foxx instead of me
		if(body && body._inner){
			json = removeValues(joiDefaults(body, json), undefined);
		}

		// remove un-writable attributes
		if(omitUnwritableAttributes) json = omit(json, stripAttributes);

		// pass to config.fromClient or Document.fromClient
		if(config.fromClient || fromClient){
			const args = {req, res,
				_key: req.param('_key') || '',
				requestedAttributes: req.param('attributes') || null,
				session: Route.session.bind(null, req, res),
				error: Route.error.bind(null, res)
			};
			if(config.fromClient) json = config.fromClient!(json, args);
			if(fromClient) json = fromClient(json, args);
		}

		logger.debug('Read input json() %o', json);

		return json;
	}

	/**
	 * Throws an error with an optional reason
	 */
	static error(res: Foxx.Response, status: ArangoDB.HttpStatus, reason?: string){
		return reason ? res.throw(status, reason) : res.throw(status);
	}

	/**
	 * Map data for client
	 */
	static forClient(
		req: Foxx.Request,
		res: Foxx.Response,
		forClient: any,
		stripAttributes: string[],
		requestedAttributes: string[],
		omitUnreadableAttributes: boolean | string = true,
		doc: DocumentData
	){
		if(config.stripDocumentKey && doc._key) delete doc._key;
		if(config.stripDocumentId && doc._id) delete doc._id;
		if(!['PATCH','PUT'].includes(req.method) && config.stripDocumentRev && doc._key)
			delete doc._rev;

		let resp = pick(doc, requestedAttributes);
		resp = omitUnreadableAttributes ? omit(resp, stripAttributes) : resp;
		if(config.forClient || forClient){
			const args = {req, res,
				_key: req.param('_key') || '',
				requestedAttributes: req.param('attributes') || null,
				session: Route.session.bind(null, req, res),
				error: Route.error.bind(null, res)
			};
			if(config.forClient) resp = config.forClient!(resp, args);
			if(forClient) resp = forClient(resp, args);
		}
		return resp;
	}

	/**
	 * Send / map response
	 */
	static send(
		req: Foxx.Request,
		res: Foxx.Response,
		forClient: any,
		stripAttributes: string[],
		requestedAttributes: string[],
		doc: DocumentData,
		omitUnreadableAttributes: boolean | string = true
	): Foxx.Response {
		const call = Route.forClient.bind(null, req, res, forClient, stripAttributes, requestedAttributes, omitUnreadableAttributes);
		let resp;
		if(Array.isArray(doc)){
			resp = doc.map(d => call({...d}));
		} else {
			resp = call({...doc});
		}
		logger.debug('Send response %o', resp);

		return res.send(resp);
	}

	/**
	 * Read document
	 */
	static get({_key, auth, collection, document}: RouteArg){
		logger.info('GET %s/%s', collection.name(), _key);
		return auth(document(), 'get', 'read');
	}

	/**
	 * Create document
	 */
	static post({json, res, auth, _key, collection}: RouteArg) {
		const body = json();
		_key = _key || body._key;
		body._key = _key;

		logger.info('POST %s/%s', collection.name(), _key||'n/a',body);

		if(_key && collection.exists(_key))
			return res.throw(409, 'Document already exists');

		const doc = auth(_key ? Object.assign(body, {_key}) : body, 'post', 'create');
		if(!doc) return;

		return Object.assign(doc, collection.insert(doc));
	}

	/**
	 * Update document
	 */
	static patch({json, res, _key, document, collection, hasAuth, auth}: RouteArg) {
		logger.info('PATCH %s/%s', collection.name(), _key);

		if(!collection.exists(_key))
			return res.throw(409, 'Document does not exist');

		const doc = json();

		if(hasAuth && !auth(Object.assign(document(), doc), 'patch', 'update'))
			return;

		// todo: implement param overwrite
		return <any>collection.update(_key, doc, {returnNew:true}).new;
	}

	/**
	 * Replace document
	 */
	static put({json, _key, document, collection, hasAuth, auth}: RouteArg) {
		logger.info('PUT %s/%s', collection.name(), _key);

		const doc: any = json();

		if(hasAuth && auth(Object.assign(document() || {}, doc), 'put', 'update'))
			return;

		// todo: implement param for create?
		return <any>collection.replace(_key, doc, {returnNew:true}).new;
	}

	/**
	 * Delete document
	 */
	static delete({res, _key, document, collection, hasAuth, auth}: RouteArg) {
		logger.info('DELETE %s/%s', collection.name(), _key);

		if(!collection.exists(_key))
			return res.throw(409, 'Document does not exist');

		if(hasAuth && !auth(document(), 'delete', 'delete')) return;

		collection.remove(_key!);
		return '';
	}
}