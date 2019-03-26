/**
 * Decorator that creates a database collection
 */
import {TypeCreateCollectionOptions} from '../collection/collection';
import {isActive} from '../index';
import {collectionList} from '../collection/collection.list';

export function Collection(opt: TypeCreateCollectionOptions): any {
	return function(constructor: any): any {
		if(isActive){
			collectionList.get(constructor).complete(opt);
		}
		return constructor;
	}
}