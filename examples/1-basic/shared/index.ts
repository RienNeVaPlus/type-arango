import typeArango, { LogLevel } from '../../../src'; // type-arango

// config
typeArango({
	// fake user roles for the sake of simplicity
	getAuthorizedRoles(){ return ['admin'] },
	// verbose
	logLevel: LogLevel.Debug
});

export * from './User';