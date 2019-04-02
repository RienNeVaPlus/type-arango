// import {isActive} from '../index';
import {getCollectionForContainer} from '../models';
import {argumentResolve} from '../utils';
import {CreateCollectionOptions, CollectionName} from '../types';

interface CollectionOpt extends CreateCollectionOptions {}
type CollectionNameFunc = (returns: CollectionName) => CollectionName;

export function Collection(): ClassDecorator;
export function Collection(name: CollectionName): ClassDecorator;
export function Collection(nameFunction: CollectionNameFunc): ClassDecorator;
export function Collection(options: CollectionOpt): ClassDecorator;
export function Collection(
	nameOrNameFunctionOrOptions: CollectionName | CollectionNameFunc | CollectionOpt = {}
): ClassDecorator {
	return (prototype: any) => {
		const col = getCollectionForContainer(prototype);
		let opt: string | CollectionOpt = argumentResolve(nameOrNameFunctionOrOptions, col.name);
		if(typeof opt === 'string')
			opt = {name:opt} as CollectionOpt;

		col.complete(opt);
		return prototype;
	}
}