import {CreateCollectionOptions, RouteDecorator, RoutePreset} from '../types'
import {Entity, getCollectionForContainer} from '../models'
import {isActive} from '..'
import {argumentResolve, enjoi, isObject} from '../utils'
import {route, ROUTE_PRESET} from './Route.decorator';
import * as Joi from 'joi';

type DocumentFunc = (returns: any) => typeof Entity;

export function Collection(ofDocument: typeof Entity): ClassDecorator;
export function Collection(ofDocumentFunction: DocumentFunc): ClassDecorator;
export function Collection(options: CreateCollectionOptions): ClassDecorator;
export function Collection(ofDocument: typeof Entity | DocumentFunc, options: CreateCollectionOptions): ClassDecorator;
export function Collection(
	ofDocument: typeof Entity | DocumentFunc | CreateCollectionOptions,
	options?: CreateCollectionOptions
): ClassDecorator {
	return (prototype: any) => {
		if(!isActive) return;

		const col = getCollectionForContainer(prototype);

		// options as first argument
		if(!options && isObject(ofDocument) && !(ofDocument instanceof Entity)){
			options = ofDocument as CreateCollectionOptions;
			if(!options.of)
				throw new Error('Missing property "of" in collection options of "'+prototype.name+'"');

			ofDocument = () => options!.of!;
		}

		if(options){
			if(options.roles)
				col.decorate('Route.roles', {prototype,rolesFunction:options.roles});
			if(options.auth)
				col.decorate('Route.auth', {prototype,authorizeFunction:options.auth});
			if(options.routes){
				const arr = typeof options.routes[0] === 'string' && ROUTE_PRESET[options.routes[0] as RoutePreset]
					? [...ROUTE_PRESET[options.routes[0] as RoutePreset], ...options.routes.slice(1)] : options.routes;
				arr.forEach((method: any) => {
					if(Array.isArray(method)){
						if(typeof method[1] === 'function') method[1] = {schema:argumentResolve(method[1], (inp: any) => enjoi(inp, 'required'), Joi)};
						route(method[0], method[1], method[2], method[3], method[4], method[5])(prototype);
					} else {
						const opt = typeof method === 'string' ? {method} : method;
						route(opt.method.toUpperCase() as RouteDecorator, opt)(prototype)
					}
				});
			}
		}

		col.decorate('Collection', {prototype, ofDocument, options});
		return prototype;
	}
}