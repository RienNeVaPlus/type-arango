/**
 * Decorator for creating a HashIndex
 */
import {collectionList} from '../collection/collection.list';
import {isActive} from '../index';
import {TypeIndexDescription} from '../collection/collection';

export function Index(opt: TypeIndexDescription){
	return function (target: any, propertyKey: string): void {
		if(!isActive) return;
		collectionList.get(target.constructor).index(propertyKey, opt);
	}
}