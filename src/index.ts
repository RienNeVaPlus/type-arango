import {isFoxx} from './utils'
import {Collection, Route, Logger} from './models'
import {RequiresFoxxEnvironmentError} from './errors'
import {Roles, RouteArgs, LogLevel, Config} from './types';

export let logger: Logger = new Logger();
export let collections: Collection[] = [];
export let routes: Route[] = [];
export let isActive: boolean = isFoxx();
export let config: Config = {
	pluralizeCollectionName: true,
	prefixCollectionName: false,
	exposeRouteFunctionsToSwagger: true,
	stripDocumentId: true,
	stripDocumentRev: true,
	stripDocumentKey: false,
	logLevel: LogLevel.Warn,
	unauthorizedThrow: 'unauthorized',
	getUserRoles(req: Foxx.Request): Roles {
		return req.session && req.session.data && req.session.data.roles || [];
	},
	getAuthorizedRoles(userRoles: Roles, accessRoles: Roles): Roles {
		return userRoles.filter((role: string) => accessRoles.includes(role));
	}
};

export {Document} from './models'
export {Collection, Route, Field, Index, Authorized} from './decorators'
export {RouteArgs, LogLevel, isFoxx}

/**
 * TypeArango() - Sets the config of `type-arango`
 */
export function configure(configuration?: Partial<Config>): Partial<Config> {
	logger.info('Configure:', configuration);
	return configuration ? config = Object.assign(config, configuration) : config;
}
export default configure;

/**
 * Provides the Foxx.Router to `type-arango`
 */
export function createRoutes(router: Foxx.Router, options?: Partial<Config>): Foxx.Router {
	if(!isFoxx()) throw new RequiresFoxxEnvironmentError('createRoutes()');
	if(options) configure(options);
	logger.info('Creating Routes...');
	routes.reverse().forEach(route => route.setup(router));
	return router;
}