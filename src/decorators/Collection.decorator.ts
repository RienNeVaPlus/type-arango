import {isActive} from '../index';
import {getFromContainer} from '../models';
import {TypeCreateCollectionOptions} from './types';
import {argumentResolve} from '../utils';

interface CollectionOpt extends TypeCreateCollectionOptions {}

export function Collection(opt?: CollectionOpt): ClassDecorator {
	return function(prototype: any): any {
		if(isActive){
			getFromContainer(prototype).complete(argumentResolve(opt));
		}
		return prototype;
	}
}