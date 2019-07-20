import {getDocumentForContainer} from '../models'
import {isActive} from '../index';

export function Document(): ClassDecorator {
	return (prototype: any) => {
		if(!isActive) return;
		const doc = getDocumentForContainer(prototype);
		// doc.decorate('Document', {prototype});
		doc.complete();
		return prototype;
	}
}