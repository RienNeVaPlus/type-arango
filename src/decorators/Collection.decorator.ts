import {CreateCollectionOptions} from '../types'
import {Entity, getCollectionForContainer} from '../models'
import {isActive} from '../index';

type DocumentFunc = (returns: any) => typeof Entity;

export function Collection(ofDocument: typeof Entity): ClassDecorator;
export function Collection(ofDocumentFunction: DocumentFunc): ClassDecorator;
export function Collection(ofDocument: typeof Entity | DocumentFunc, options: CreateCollectionOptions): ClassDecorator;
export function Collection(
	ofDocumentFunction: typeof Entity | DocumentFunc,
	options?: CreateCollectionOptions
): ClassDecorator {
	return (prototype: any) => {
		if(isActive) getCollectionForContainer(prototype).decorate('Collection', {prototype, ofDocumentFunction, options});
		return prototype;
	}
}