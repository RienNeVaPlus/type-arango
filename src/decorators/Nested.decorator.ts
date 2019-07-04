import {getDocumentForContainer} from '../models';

/**
 * Nested is currently an alias of Document
 */
export function Nested(
	insideDocumentFunction?: () => any
): ClassDecorator {
	return (prototype: any) => {
		getDocumentForContainer(prototype).decorate('Nested', {prototype, insideDocumentFunction});
		return prototype;
	}
}