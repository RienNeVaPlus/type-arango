import {getDocumentForContainer} from '../models'
import {isActive} from '../index';
import {DocumentData} from '../types';

export function ForClient(
	forClient: (doc: DocumentData, opt?: any) => DocumentData
): ClassDecorator {
	return (prototype: any) => {
		if(!isActive) return;
		const doc = getDocumentForContainer(prototype);
		console.log('SET FPR CÖOEMT',doc.options);
		doc.options = Object.assign(doc.options||{}, {forClient});
		console.log('options', doc.options);
	}
}