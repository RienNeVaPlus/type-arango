import {isFoxx} from './utils'
import {Collection, Document, Route, Logger, Entities, Entity, Type} from './models'
import {RequiresFoxxEnvironmentError} from './errors'
import {Roles, RouteArg, LogLevel, Config, Related, RouteRolesArg} from './types'

export const version: string = require('../package.json').version;
export const logger: Logger = new Logger();
export const collections: Collection[] = [];
export const documents: Document<any>[] = [];
export const routes: Route[] = [];
export const isActive: boolean = isFoxx();
export const config: Config = {
	logLevel: LogLevel.Warn,
	prefixCollectionName: false,
	exposeRouteFunctionsToSwagger: false,
	dasherizeRoutes: true,
	stripDocumentId: true,
	stripDocumentRev: true,
	stripDocumentKey: false,
	unregisterAQLFunctionEntityGroup: true,
	addAttributeWritersToReaders: true,
	defaultLocale: 'en',
	defaultListLimit: 25,
	defaultListLimitMax: 100,
	forClient: null,
	fromClient: null,
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
	Collection, Route, Description, Document, Edge, Nested, Attribute, Index,
	OneToOne, OneToMany, Authorized, Before, After, ForClient, FromClient, Task, AQLFunction
} from './decorators'
export {RouteArg, RouteRolesArg, LogLevel, Related, isFoxx, Entities, Entity, Type}

export function complete(){
	if(!isActive) return;
	documents.forEach(doc => doc.finalize());
	collections.forEach(col => col.finalize());
}

/**
 * TypeArango() - Sets the config of `type-arango`
 */
export function configure(configuration?: Partial<Config>) {
	if(configuration) {
		Object.assign(config, configuration);
		logger.info('Configure:', configuration);
	}
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