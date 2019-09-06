import typeArango, { LogLevel } from '../../../src' // type-arango

const complete = typeArango({
	// verbose
	logLevel: LogLevel.Debug
});

export * from './Author.entity';
export * from './Book.entity';

complete();