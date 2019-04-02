import typeArango, { LogLevel } from '../../../src';
import { Roles } from '../../../src/types'; // type-arango

// config
typeArango({
	// verbose
	logLevel: LogLevel.Debug,

	// extracts the users `roles` from req.session.data.roles (default)
	getUserRoles(req: Foxx.Request): Roles {
		return req.session && req.session.data && req.session.data.roles || [];
	},

	// returns the user access roles that can be applied to the current route
	getAuthorizedRoles(userRoles: Roles, accessRoles: Roles): Roles {
		return userRoles.filter((role: string) => accessRoles.includes(role));
	},

	// http status sent on unauthorized route
	unauthorizedThrow: 'unauthorized',
});

export * from './User';