/**
 * The `@Route.X` decorators provide the endpoints
 * - @Route.GET(roles) - retrieve entity
 * - @Route.POST(roles) - create entity
 * - @Route.PATCH(roles) - update / merge entity
 * - @Route.PUT(roles) - replace entity
 * - @Route.DELETE(roles) - remove entity
 */
import {isActive} from '../index';
import {RouteMethod} from './types';
import {getFromContainer, RouteOptions} from '../models';
import {RolesFunc, Roles} from '../models/types';
import {argumentResolve} from '../utils';

function route(
	method: RouteMethod,
	rolesOrFunctionOrOptions: Roles | RolesFunc | RouteOptions,
	opt?: RouteOptions
): ClassDecorator {
	return function(prototype: any): any {
		if(isActive){
			opt = rolesOrFunctionOrOptions === 'object' ? rolesOrFunctionOrOptions :
				Object.assign(opt||{}, {
					roles: argumentResolve(rolesOrFunctionOrOptions),
				});

			getFromContainer(prototype).addRoute(method, opt);
		}
		return prototype;
	}
}

export const Route = {
	get: (rolesOrFunctionOrOptions: Roles | RolesFunc | RouteOptions, opt?: RouteOptions) =>
		route('get', rolesOrFunctionOrOptions, opt),
	post: (rolesOrFunctionOrOptions: Roles | RolesFunc | RouteOptions, opt?: RouteOptions) =>
		route('post', rolesOrFunctionOrOptions, opt),
	patch: (rolesOrFunctionOrOptions: Roles | RolesFunc | RouteOptions, opt?: RouteOptions) =>
		route('patch', rolesOrFunctionOrOptions, opt),
	put: (rolesOrFunctionOrOptions: Roles | RolesFunc | RouteOptions, opt?: RouteOptions) =>
		route('put', rolesOrFunctionOrOptions, opt),
	delete: (rolesOrFunctionOrOptions: Roles | RolesFunc | RouteOptions, opt?: RouteOptions) =>
		route('delete', rolesOrFunctionOrOptions, opt),

	all: (
		creatorsOrFunctionOrOptions: Roles | RolesFunc | RouteOptions,
		readersOrFunctionOrOptions: Roles | RolesFunc | RouteOptions,
		updatersOrFunctionOrOptions: Roles | RolesFunc | RouteOptions,
		deletersOrFunctionOrOptions: Roles | RolesFunc | RouteOptions,
		opt?: RouteOptions
	) => {
		return function(prototype: any): any {
			route('delete', deletersOrFunctionOrOptions, opt)(prototype);
			route('put', updatersOrFunctionOrOptions, opt)(prototype);
			route('patch', updatersOrFunctionOrOptions, opt)(prototype);
			route('post', creatorsOrFunctionOrOptions, opt)(prototype);
			route('get', readersOrFunctionOrOptions, opt)(prototype);
			return prototype;
		};
	}
	// TODO?
	// search: (opt: RouteOptions) => route('get', opt)
};