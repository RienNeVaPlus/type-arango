import 'reflect-metadata'
import {SymbolKeysNotSupportedError} from '../errors'
import {IndexOptions} from '../types'
import {argumentResolve} from '../utils'
import {getDocumentForContainer} from '../models'
import {isActive} from '../index';

export type IndexTypeFunct = (a: void) => ArangoDB.IndexType;
type AdditionalField = string;

export function Index(): PropertyDecorator;
export function Index(indexType: ArangoDB.IndexType): PropertyDecorator;
export function Index(additionalFields: AdditionalField[], options: IndexOptions): PropertyDecorator;
export function Index(indexTypeFunction: IndexTypeFunct): PropertyDecorator;
export function Index(indexType: ArangoDB.IndexType, options: IndexOptions): PropertyDecorator;
export function Index(indexTypeFunction: IndexTypeFunct, options: IndexOptions): PropertyDecorator;
export function Index(options: IndexOptions): PropertyDecorator;
export function Index(
	indexTypeOrFunctionOrOptions?: string[] | ArangoDB.IndexType | IndexTypeFunct | IndexOptions,
	maybeOptions?: IndexOptions
): PropertyDecorator {
	return (prototype: any, attribute: string | symbol) => {
		if(!isActive) return;
		if(typeof attribute === 'symbol')
			throw new SymbolKeysNotSupportedError();

		// parse arguments
		let options = argumentResolve(indexTypeOrFunctionOrOptions);

		if(!options) options = {};
		else if(typeof options === 'string') options = {type:options};
		else if(Array.isArray(options)) options = {additionalFields:options};

		options.type = options.type || 'hash';

		// merge additional options
		if(maybeOptions) options = {...maybeOptions, ...options};

		options = {...options, fields: [attribute].concat(options.additionalFields||[])} as ArangoDB.Index;
		getDocumentForContainer(prototype.constructor).decorate('Index', {prototype, attribute, options});
	}
}