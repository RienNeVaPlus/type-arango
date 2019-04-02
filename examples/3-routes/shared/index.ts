import typeArango, {LogLevel} from '../../../src'; // type-arango

// config
typeArango({
	// verbose
	logLevel: LogLevel.Debug
});

export * from './User.entity';