import 'reflect-metadata';
import {SymbolKeysNotSupportedError} from '../errors';
import {getCollectionForContainer} from '../models';
import {IndexOptions, IndexOptionsWithType, IndexTypeFunct} from '../types';
import {argumentResolve} from '../utils';

export function Index(): PropertyDecorator;
export function Index(indexType: ArangoDB.IndexType): PropertyDecorator;
export function Index(indexTypeFunction: IndexTypeFunct): PropertyDecorator;
export function Index(indexType: ArangoDB.IndexType, options: IndexOptions): PropertyDecorator;
export function Index(indexTypeFunction: IndexTypeFunct, options: IndexOptions): PropertyDecorator;
export function Index(options: IndexOptionsWithType): PropertyDecorator;
export function Index(
	indexTypeOrFunctionOrOptions?: ArangoDB.IndexType | IndexTypeFunct | IndexOptions,
	maybeOptions?: IndexOptions
): PropertyDecorator {
	return (prototype, propertyKey) => {
		if(typeof propertyKey === 'symbol')
			throw new SymbolKeysNotSupportedError();

		// parse arguments
		let opt: IndexOptions = argumentResolve(indexTypeOrFunctionOrOptions);
		if(!indexTypeOrFunctionOrOptions) opt = {type:'hash'};
		else if(typeof indexTypeOrFunctionOrOptions === 'string'){
			opt = {type:indexTypeOrFunctionOrOptions};
		}

		// merge additional options
		if(maybeOptions) opt = Object.assign(maybeOptions, opt);

		// add metadata
		const {type = 'hash', additionalFields = [], sparse, unique, deduplicate} = opt;
		getCollectionForContainer(prototype.constructor).addMetadata('index', propertyKey, {
			fields: [propertyKey].concat(additionalFields),
			type, sparse, unique, deduplicate
		});
	}
}