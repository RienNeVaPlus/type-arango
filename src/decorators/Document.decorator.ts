import {getDocumentForContainer} from '../models'
import {DocumentOptions} from '../types'

export function Document(
	options?: DocumentOptions
): ClassDecorator {
	return (prototype: any) => {
		const doc = getDocumentForContainer(prototype);
		doc.decorate('Document', {prototype, options});
		doc.complete();
		return prototype;
	}
}