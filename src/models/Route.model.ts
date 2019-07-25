import {Document,Collection} from '.'
import {config, logger, RouteArg, routes} from '../index'
import {db, joiDefaults, omit, pick, queryBuilder, removeValues, toArray} from '../utils'
import {
	DocumentData,
	QueryOpt,
	Roles,
	RouteAction,
	RouteAuthArg,
	RouteData,
	RouteMethod,
	RouteOpt,
	RouteQueryParam,
	RouteResponse,
	RouteRolesArg
} from '../types'
import {Scalar} from './Scalar.model'
import * as Joi from 'joi'
import {MissingKeyError} from '../errors';

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

		if(!path){
			if(!path && opt.action === 'list')
				path = collectionName;

			if(path === undefined)
				return opt;
		}

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

		const sortValues = Object.keys(col.doc!.schema);

		// `select` query param
		if(['get','post','patch','put'].includes(method) || opt.action === 'list'){
			queryParams = [[
				'attributes', Joi.string(),
				`✂️ **Comma separated list of attributes to return**
				  &nbsp; &nbsp; &nbsp; \`Values: ${sortValues.join(', ')}\`
				  &nbsp; &nbsp; &nbsp; \`Example: ?attributes=${sortValues.slice(0,2).join(',')}\``
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
			queryParams = (opt.queryParams || []).concat(queryParams||[]);

			if(opt.action === 'list'){
				summary = summary || `Returns ${name}[]`;
				description = description || `Prints a list of ${name} documents of the collection **${col.name}**.`;
				response.description = `Array of ${name} documents of the ${col.name} collection.`;
				handler = handler || Route.list;
				let qp = Object.values(queryParams).map(qp => qp[0]);
				if(!qp.includes('limit'))
					queryParams.push(['limit', Joi.number().min(1).max(config.defaultListLimitMax).default(config.defaultListLimit),
						'**#️⃣ Limit results**\n　    `Example: ?limit=100`']);
				if(!qp.includes('offset'))
					queryParams.push(['offset', Joi.number().default(0),
						'**⏭️ Skip results**\n　    `Example: ?offset=25`']);
				if(!qp.includes('sort'))
					queryParams.push(['sort', Joi.any().valid(...sortValues),
						'**🔀 Sort results by attribute**\n　    `Values: '+sortValues.join(', ')+'`\n　    `Example: ?sort='+sortValues[0]+'`']);
				if(!qp.includes('order'))
					queryParams.push(['order', Joi.any().valid('ASC','DESC').default('ASC'),
						'**🔃 Order results**\n　    `Values: ASC, DESC`\n　    `Example: ?order=DESC`']);
			}
		} else {
			switch(method){
				default:
				case 'get':
					summary = summary || `Returns ${name}`;
					description = description || `Prints a ${name} document of the collection **${col.name}**.`;
					response.description = `${name} document of the ${col.name} collection.`;
					break;

				case 'post':
					summary = summary || `Inserts ${name}`;
					description = description || `Inserts and prints the **${name}** document of the collection **${col.name}**.`;
					body = body || [col.doc!.joi, `📑 **${name}  document to create**`];
					response.status = 'created';
					response.description = `The newly created ${name} document of the ${col.name} collection.`;
					break;

				case 'patch':
					summary = summary || `Updates ${name}`;
					description = description || `Updates and prints the **${name}** document of the collection **${col.name}**.`;
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

		if(opt.action !== 'list' && handler){
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

		const action: RouteAction = opt.action ||
			method === 'get' ? 'read' :
			method === 'post' ? 'create' :
			method === 'delete' ? 'delete' : 'update';

		const routeData: RouteData = {
			router, method, action, name: col.name, path, roleStripAttributes: col.doc!.roleStripAttributes,
			doc: col.doc,
			tags, summary, description, roles: roles||[], response, errors, deprecated,
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
		action,
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
		const {aql} = require('@arangodb');
		const { info, debug, warn } = logger;
		info('- Setup %s %s', method.toUpperCase(), path);

		const collection = db._collection(name);
		const document = Route.document.bind(null, collection, doc);
		const insert = Route.insert.bind(null, collection, doc);
		const update = Route.modify.bind(null, collection, doc, 'update');
		const replace = Route.modify.bind(null, collection, doc, 'replace');
		const remove = Route.remove.bind(null, collection, doc);
		const validParams: string[] = [];
		queryParams.forEach(qp => validParams.push(qp[0]));
		pathParams.forEach(qp => validParams.push(qp[0]));

		const route = router[method](
			path,
			(req: Foxx.Request, res: Foxx.Response) => {
				const { getUserRoles, getAuthorizedRoles, throwForbidden } = config;

				info('[client %s] %s %s', req.remoteAddress, req.method.toUpperCase(),req.path);
				debug('Required roles %o', roles);

				// authorize by route/collection roles
				let userRoles = getUserRoles(req);
				let tmp = {doc:null};

				const param = validParams.reduce((c: any, n) => {
					c[n] = req.pathParams[n] || req.queryParams[n];
					return c;
				}, {});

				const _key = param._key;
				const args: RouteRolesArg = {
					name, req, res, roles, path, method, action, aql, validParams, param,
					_key,
					collection,
					document: document.bind(null, tmp, action !== 'create', _key),
					exists: collection.exists.bind(collection),
					insert,
					update: update.bind(null, _key),
					replace: replace.bind(null, _key),
					remove: remove.bind(null, _key),
					query: Route.query.bind(null),
					session: Route.session.bind(null, req, res),
					requestedAttributes: req.queryParams.attributes ? req.queryParams.attributes.split(',') : null,
					hasAuth: !!routeAuths.length,
					auth: Route.auth.bind(null, req, res, roles, routeAuths),
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
	 * Request based document cache in order to avoid duplicate calls to collection.document (only active when document() is called without an argument)
	 */
	static document(collection: ArangoDB.Collection, doc: Document, tmp: any = {}, canThrow: boolean = true, key: string, selector?: string | ArangoDB.DocumentLike){
		let k: string | ArangoDB.DocumentLike = selector || key;
		if(!k) throw new MissingKeyError(collection.name());

		// temp cache to avoid duplicate reads
		if(!selector || selector === key){
			if(tmp.doc) return tmp.doc;
			return tmp.doc = Route.documentRead(collection, doc, canThrow, k);
		}
		return Route.documentRead(collection, doc, canThrow, k);
	}

	/**
	 * Used by Route.document
	 */
	static documentRead(collection: ArangoDB.Collection, doc: Document, canThrow: boolean = true, selector: string | ArangoDB.DocumentLike){
		selector = doc.emitBefore('document', selector);
		try { return doc.emitAfter('document', collection.document(selector), selector); }
		catch(e){
			if(canThrow) throw e;
			return {};
		}
	}

	/**
	 * Executes collection.insert, triggers listeners
	 */
	static insert(collection: ArangoDB.Collection, doc: Document, data: DocumentData, options?: ArangoDB.InsertOptions){
		data = doc.emitBefore('write', doc.emitBefore('insert', data));
		return doc.emitAfter('write', doc.emitAfter('insert', collection.insert(data, options)));
	}

	/**
	 * Executes collection.update / collection.replace, triggers listeners
	 */
	static modify(
		collection: ArangoDB.Collection,
		doc: Document,
		method: 'update' | 'replace',
		key: string,
		selectorOrData: string | ArangoDB.DocumentLike | DocumentData,
		dataOrOptions?: DocumentData | ArangoDB.UpdateOptions,
		options?: ArangoDB.UpdateOptions
	){
		let k: string | ArangoDB.DocumentLike = key;
		let d: DocumentData;
		let o: ArangoDB.UpdateOptions;

		// selector is selector
		if(typeof selectorOrData === 'string' || (selectorOrData && (selectorOrData._key || selectorOrData._id))){
			k = selectorOrData as string;
			d = dataOrOptions as DocumentData;
			o = options as ArangoDB.UpdateOptions;
		}
		// selector is document
		else {
			d = selectorOrData as DocumentData;
			o = dataOrOptions as ArangoDB.UpdateOptions;
		}

		if(!k) throw new MissingKeyError(collection.name());

		d = doc.emitBefore('write',
			doc.emitBefore('modify',
				doc.emitBefore(method, d, k),
			k),
		k);

		return doc.emitAfter('write', doc.emitAfter('modify',
			doc.emitAfter(method, collection[method](k, d, o), k),
		k), k);
	}

	/**
	 * Executes collection.remove, triggers listeners
	 */
	static remove(
		collection: ArangoDB.Collection,
		doc: Document,
		key: string,
		selector?: string | ArangoDB.DocumentLike | ArangoDB.RemoveOptions,
		options?: ArangoDB.RemoveOptions
	){
		let k: string | ArangoDB.DocumentLike = key;
		let o: ArangoDB.RemoveOptions = {};
		// selector is selector
		if(typeof selector === 'string' || (selector && (selector.hasOwnProperty('_key') || selector.hasOwnProperty('_id')))){
			k = selector as string;
			o = options as ArangoDB.RemoveOptions;
		}
		// selector is option
		else if(selector) {
			o = selector as ArangoDB.RemoveOptions;
		}

		if(!k) throw new MissingKeyError(collection.name());

		k = doc.emitBefore('remove', k);
		return doc.emitAfter('remove', collection.remove(k, o));
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
	 * Authorizes a document by calling the Route.auth handlers
	 */
	static auth(
		req: Foxx.Request,
		res: Foxx.Response,
		roles: Roles,
		authorizes: any[],
		document: DocumentData,
		method?: RouteMethod,
		action?: RouteAction,
		canThrow: boolean = true
	){
		if(!authorizes.length) return document;
		const args: RouteAuthArg = {session:req.session!, roles, doc:document, document, method, action, req, res};
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

		// add joi defaults to result, this should've been done by Foxx instead of me
		if(body && body._inner){
			json = removeValues(joiDefaults(body, json), undefined);
		}

		// remove un-writable attributes
		if(json && omitUnwritableAttributes) json = omit(json, stripAttributes);

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
		doc: DocumentData | any,
		omitUnreadableAttributes: boolean | string = true
	): Foxx.Response {
		const call = Route.forClient.bind(null, req, res, forClient, stripAttributes, requestedAttributes, omitUnreadableAttributes);
		let resp;
		if(Array.isArray(doc)){
			resp = doc.map(d => call({...d}));
		} else if(doc && typeof doc === 'object') {
			resp = call({...doc});
		} else {
			resp = doc;
		}
		logger.debug('Send response %o', resp);

		return res.send(resp);
	}

	/**
	 * Read document
	 */
	static get({_key, auth, name, document}: RouteArg){
		logger.info('GET %s/%s', name, _key);
		return auth(document(), 'get', 'read');
	}

	/**
	 * Create document
	 */
	static post({json, res, auth, _key, name, exists, insert}: RouteArg) {
		const body = json();
		_key = _key || body._key;
		body._key = _key;

		logger.info('POST %s/%s', name, _key||'n/a',body);

		if(_key && exists(_key))
			return res.throw(409, 'Document already exists');

		const doc = auth(_key ? Object.assign(body, {_key}) : body, 'post', 'create');
		if(!doc) return;

		return Object.assign(doc, insert(doc));
	}

	/**
	 * Update document
	 */
	static patch({json, res, _key, document, exists, update, name, hasAuth, auth}: RouteArg) {
		logger.info('PATCH %s/%s', name, _key);

		if(!exists(_key))
			return res.throw(409, 'Document does not exist');

		const doc = json();

		if(hasAuth && !auth(Object.assign(document(), doc), 'patch', 'update'))
			return;

		return update(_key, doc, {returnNew:true}).new;
	}

	/**
	 * Replace document
	 */
	static put({json, _key, document, replace, name, hasAuth, auth}: RouteArg) {
		logger.info('PUT %s/%s', name, _key);

		const doc: any = json();

		if(hasAuth && auth(Object.assign(document() || {}, doc), 'put', 'update'))
			return;

		return replace(_key, doc, {returnNew:true}).new;
	}

	/**
	 * Delete document
	 */
	static delete({res, _key, document, exists, remove, name, hasAuth, auth}: RouteArg) {
		logger.info('DELETE %s/%s', name, _key);

		if(!exists(_key))
			return res.throw(409, 'Document does not exist');

		if(hasAuth && !auth(document(), 'delete', 'delete')) return;

		remove(_key!);
		return null;
	}

	/**
	 * List documents
	 */
	static list({name, requestedAttributes, param, hasAuth, auth}: RouteArg) {
		logger.info('LIST %s/%s', name);

		const { attributes, offset, limit = config.defaultListLimit, sort, order, ...filter } = param;

		let q: QueryOpt = {
			filter,
			keep: requestedAttributes,
			sort: [sort+' '+order],
			limit: offset ? [offset, limit] : limit
		};

		return db._query(
			queryBuilder(name, q)
		)
			.toArray()
			.filter(
				(doc: DocumentData) => !hasAuth || auth(doc, 'get', 'list')
			);
	}
}