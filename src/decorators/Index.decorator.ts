import 'reflect-metadata';
import {SymbolKeysNotSupportedError} from '../errors';
import {IndexOptions, IndexOptionsWithType} from '../types';
import {argumentResolve} from '../utils';
import {getDocumentForContainer} from '../models';

export type IndexTypeFunct = (returns: ArangoDB.IndexType) => ArangoDB.IndexType;

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
	return (prototype: any, attribute: string | symbol) => {
		if(typeof attribute === 'symbol')
			throw new SymbolKeysNotSupportedError();

		// parse arguments
		let options = argumentResolve(indexTypeOrFunctionOrOptions);

		if(!options) options = {type:'hash'};

		// merge additional options
		if(maybeOptions) options = Object.assign(maybeOptions, options);

		options = {...options, fields: [attribute].concat(options.additionalFields||[])} as ArangoDB.Index;
		getDocumentForContainer(prototype.constructor).decorate('Index', {prototype, attribute, options});
	}
}