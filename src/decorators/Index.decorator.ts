import {isActive} from '../index';
import 'reflect-metadata';
import {IndexOptions} from './types';
import {SymbolKeysNotSupportedError} from '../errors';
import {getFromContainer} from '../models';

export function Index({type = 'hash',additionalFields = [], sparse, unique, deduplicate}: IndexOptions): PropertyDecorator {
	return function (prototype, propertyKey){
		if(!isActive) return;
		if(typeof propertyKey === 'symbol') {
			throw new SymbolKeysNotSupportedError();
		}

		getFromContainer(prototype.constructor).addMetadata('index', propertyKey, {
			fields: [propertyKey].concat(additionalFields),
			type, sparse, unique, deduplicate
		});
	}
}