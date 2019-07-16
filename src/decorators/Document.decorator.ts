import {getDocumentForContainer} from '../models'
import {DocumentOptions} from '../types'
import {isActive} from '../index';

export function Document(
	options?: DocumentOptions
): ClassDecorator {
	return (prototype: any) => {
		if(!isActive) return;
		const doc = getDocumentForContainer(prototype);
		doc.decorate('Document', {prototype, options});
		doc.complete();
		return prototype;
	}
}