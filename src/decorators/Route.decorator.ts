/**
 * The `@Route.X` decorators provide the endpoints
 * - @Route.GET(roles) - retrieve entity
 * - @Route.POST(roles) - create entity
 * - @Route.PATCH(roles) - update / merge entity
 * - @Route.PUT(roles) - replace entity
 * - @Route.DELETE(roles) - remove entity
 * - @Route.all(creators, readers, updaters, deleters) - all routes
 */
import {isActive} from '../index';
import {getCollectionForContainer, Route as RouteModel} from '../models';
import {argumentResolve, enjoi, removeUndefined} from '../utils';
import {ClassAndMethodDecorator, Roles, RolesFunc, RouteMetadata, RouteMethod, RouteOpt} from '../types';
import {SymbolKeysNotSupportedError} from '../errors';
import * as Joi from 'joi';
import {Schema} from 'joi';

export type PathFunc = (returns: string) => any;
type SchemaFunc = (returns: typeof Joi) => typeof Joi | boolean;

type ArgPathOrRolesOrOpt = string | PathFunc | Roles | RolesFunc | RouteOpt;
type ArgSchemaOrRolesOrOpt = boolean | Schema | SchemaFunc | Roles | RolesFunc | RouteOpt;
type ArgRolesOrOpt = Roles | RolesFunc | RouteOpt;

function route(
	method: RouteMethod,
	pathOrRolesOrFunctionOrOptions?: ArgPathOrRolesOrOpt,
	schemaOrRolesOrFunctionOrOptions?: ArgSchemaOrRolesOrOpt,
	rolesOrFunctionOrOptions?: ArgRolesOrOpt,
	options?: RouteOpt
): ClassAndMethodDecorator {
	return function(prototype: any, propertyKey?: string | symbol): any {
		if (!isActive) return;
		if(typeof propertyKey === 'symbol')
			throw new SymbolKeysNotSupportedError();

		const col = getCollectionForContainer(prototype);
		let opt = argumentResolve(pathOrRolesOrFunctionOrOptions);

		opt = Object.assign({},
			typeof opt === 'string' ? {path:opt} : Array.isArray(opt)  ? {roles:opt} : opt || {}
		);

		let schema = argumentResolve(schemaOrRolesOrFunctionOrOptions, enjoi);
		let roles = argumentResolve(rolesOrFunctionOrOptions);

		// parse schema argument
		if(Array.isArray(schema)){
			opt.roles = schema;
			schema = null;
		}
		else if(schema === false)
			schema = null;
		else if(!schema)
			schema = col.joi;

		if(schema){
			if(schema.isJoi) {
				if(method === 'get') opt.queryParams = [schema];
				else opt.body = [schema];
			}
			else if(typeof schema === 'object'){
				opt = Object.assign(schema, opt);
			}
		}

		if(Array.isArray(roles))
			opt.roles = roles;

		if(options)
			opt = Object.assign(options, opt);

		// is MethodDecorator, replace callback with method
		if(propertyKey) {
			opt.handler = prototype[propertyKey];
			opt.handlerName = propertyKey;
		}
		// is ClassDecorator, save roles to collection
		else if(opt.roles && opt.roles.length) {
			if(method === 'post') col.addRoles('creators', opt.roles);
			else if(method === 'get') col.addRoles('readers', opt.roles);
			else if(method === 'delete') col.addRoles('deleters', opt.roles);
			else col.addRoles('updaters', opt.roles);
		}

		if(opt.path !== undefined) {
			opt = RouteModel.parsePath(opt, col.name);
		}

		const data: RouteMetadata = removeUndefined({method,opt});
		col.addMetadata('route', propertyKey || '', data);

		return prototype;
	}
}

export const Route = {
	GET: (
		pathOrRolesOrFunctionOrOptions?: ArgPathOrRolesOrOpt,
		schemaOrRolesOrFunctionOrOptions?: ArgSchemaOrRolesOrOpt,
		rolesOrFunctionOrOptions?: ArgRolesOrOpt,
		options?: RouteOpt
	) => route('get',
		pathOrRolesOrFunctionOrOptions,
		schemaOrRolesOrFunctionOrOptions,
		rolesOrFunctionOrOptions,
		options),
	POST: (
		pathOrRolesOrFunctionOrOptions?: ArgPathOrRolesOrOpt,
		schemaOrRolesOrFunctionOrOptions?: ArgSchemaOrRolesOrOpt,
		rolesOrFunctionOrOptions?: ArgRolesOrOpt,
		options?: RouteOpt
	) => route('post',
		pathOrRolesOrFunctionOrOptions,
		schemaOrRolesOrFunctionOrOptions,
		rolesOrFunctionOrOptions,
		options),
	PATCH: (
		pathOrRolesOrFunctionOrOptions?: ArgPathOrRolesOrOpt,
		schemaOrRolesOrFunctionOrOptions?: ArgSchemaOrRolesOrOpt,
		rolesOrFunctionOrOptions?: ArgRolesOrOpt,
		options?: RouteOpt
	) => route('patch',
		pathOrRolesOrFunctionOrOptions,
		schemaOrRolesOrFunctionOrOptions,
		rolesOrFunctionOrOptions,
		options),
	PUT: (
		pathOrRolesOrFunctionOrOptions?: ArgPathOrRolesOrOpt,
		schemaOrRolesOrFunctionOrOptions?: ArgSchemaOrRolesOrOpt,
		rolesOrFunctionOrOptions?: ArgRolesOrOpt,
		options?: RouteOpt
	) => route('put',
		pathOrRolesOrFunctionOrOptions,
		schemaOrRolesOrFunctionOrOptions,
		rolesOrFunctionOrOptions,
		options),
	DELETE: (
		pathOrRolesOrFunctionOrOptions?: ArgPathOrRolesOrOpt,
		schemaOrRolesOrFunctionOrOptions?: ArgSchemaOrRolesOrOpt,
		rolesOrFunctionOrOptions?: ArgRolesOrOpt,
		options?: RouteOpt
	) => route('delete',
		pathOrRolesOrFunctionOrOptions,
		schemaOrRolesOrFunctionOrOptions,
		rolesOrFunctionOrOptions,
		options),

	enable: (
		rolesOrCreatorsOrFunction: Roles | RolesFunc = [],
		readersOrFunction?: Roles | RolesFunc,
		updatersOrFunction?: Roles | RolesFunc,
		deletersOrFunction?: Roles | RolesFunc
	) => {
		return function(prototype: any): any {
			const col = getCollectionForContainer(prototype);

			let creators = argumentResolve(rolesOrCreatorsOrFunction);
			let readers = argumentResolve(readersOrFunction);
			let updaters = argumentResolve(updatersOrFunction);
			let deleters = argumentResolve(deletersOrFunction);

			// call (globalRoles)
			if(!readers && !updaters && !deleters){
				readers = creators;
				updaters = creators;
				deleters = creators;
			}

			col.addRoles('creators', creators);
			col.addRoles('readers', readers);
			col.addRoles('updaters', updaters);
			col.addRoles('deleters', deleters);

			if(col.completed) col.processMetadata();
		}
	},

	all: (
		rolesOrCreatorsOrFunctionOrOptions?: Roles | RolesFunc | RouteOpt,
		readersOrFunctionOrOptions?: Roles | RolesFunc | RouteOpt,
		updatersOrFunctionOrOptions?: Roles | RolesFunc | RouteOpt,
		deletersOrFunctionOrOptions?: Roles | RolesFunc | RouteOpt,
		globalOptions?: RouteOpt
	) => {
		return function(prototype: any): any {
			let creators = argumentResolve(rolesOrCreatorsOrFunctionOrOptions);
			let readers = argumentResolve(readersOrFunctionOrOptions);
			let updaters = argumentResolve(updatersOrFunctionOrOptions);
			let deleters = argumentResolve(deletersOrFunctionOrOptions);

			// call (opt)
			if(creators && !Array.isArray(creators)){
				globalOptions = creators;
				creators = undefined;
			}

			// call (globalRoles, opt?)
			if((!readers || !Array.isArray(readers)) && !updaters && !deleters){
				if(readers) globalOptions = readers;
				readers = creators;
				updaters = creators;
				deleters = creators;
			}

			// setup routes
			route('delete', deleters, globalOptions)(prototype);
			route('put', updaters, globalOptions)(prototype);
			route('patch', updaters, globalOptions)(prototype);
			route('post', creators, globalOptions)(prototype);
			route('get', readers, globalOptions)(prototype);

			const col = getCollectionForContainer(prototype);
			if(col.completed) col.processMetadata();

			return prototype;
		};
	}
	// TODO: implement search route for Entity.find()
	// search: (opt: RouteOpt) => route('get', opt)
};