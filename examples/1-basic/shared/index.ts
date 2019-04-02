import typeArango, { LogLevel } from '../../../src'; // type-arango

// config
typeArango({
	// fake user roles for the typescript-minimal example
	getAuthorizedRoles(){ return ['admin'] },
	// verbose
	logLevel: LogLevel.Debug
});

export * from './User';