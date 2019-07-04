import {isFoxx} from './utils'
import {Collection, Document, Route, Logger, Entities, Entity, Type} from './models'
import {RequiresFoxxEnvironmentError} from './errors'
import {Roles, RouteArg, LogLevel, Config, Related, RouteRolesArg} from './types';

export let logger: Logger = new Logger();
export let collections: Collection[] = [];
export let documents: Document<any>[] = [];
export let routes: Route[] = [];
export let isActive: boolean = isFoxx();
export let config: Config = {
	prefixCollectionName: false,
	exposeRouteFunctionsToSwagger: false,
	dasherizeRoutes: true,
	stripDocumentId: true,
	stripDocumentRev: true,
	stripDocumentKey: false,
	addAttributeWritersToReaders: true,
	forClient: null,
	fromClient: null,
	logLevel: LogLevel.Warn,
	providedRolesDefault: ['guest'],
	requiredRolesFallback: ['user'],
	requiredWriterRolesFallback: ['admin'],
	throwUnauthorized: 'unauthorized',
	throwForbidden: 'forbidden',
	getUserRoles(req: Foxx.Request): Roles {
		return (req.session && req.session.data && req.session.data.roles || []).concat(config.providedRolesDefault);
	},
	getAuthorizedRoles(userRoles: Roles, accessRoles: Roles): Roles {
		return userRoles.filter((role: string) => accessRoles.includes(role));
	}
};

// export {Document} from './models'
export {
	Collection, Route, Description, Document, Nested, Attribute, Index,
	OneToOne, OneToMany, Authorized
} from './decorators'
export {RouteArg, RouteRolesArg, LogLevel, Related, isFoxx, Entities, Entity, Type}

export function complete(){
	documents.forEach(doc => doc.finalize());
	collections.forEach(col => col.finalize());
}

/**
 * TypeArango() - Sets the config of `type-arango`
 */
export function configure(configuration?: Partial<Config>) {
	logger.info('Configure:', configuration);
	if(configuration) config = Object.assign(config, configuration);
	return complete;
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