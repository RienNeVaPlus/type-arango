import {getFromContainer} from '../models';
import {isActive} from '../index';
import {TypeValue} from './types';
import {SymbolKeysNotSupportedError} from '../errors';
import {FieldMetadata, Roles} from '../models/types';
import {argumentResolve, removeUndefined} from '../utils';

type ReturnTypeFunc = (returns?: void) => TypeValue;
type ReadersFunc = (returns?: void) => Roles;
type WritersFunc = (returns?: void) => Roles;

export function Field(
	returnTypeOrFunction?: ReturnTypeFunc | TypeValue,
	readersArrayOrFunction?: ReadersFunc | Roles,
	writersArrayOrFunction?: WritersFunc | Roles): PropertyDecorator
{
	return (prototype, field) => {
		if(!isActive) return;
		if(typeof field === 'symbol') {
			throw new SymbolKeysNotSupportedError();
		}

		const metadata = Reflect.getMetadata("design:type", prototype, field);
		const type: TypeValue = argumentResolve(returnTypeOrFunction) || metadata;
		const readers: Roles = argumentResolve(readersArrayOrFunction);
		const writers: Roles = argumentResolve(writersArrayOrFunction);

		let obj: FieldMetadata = {
			metadata,
			type
		};
		if(readers){
			obj.authorized = removeUndefined({readers:readers,writers});
		}

		getFromContainer(prototype.constructor).addMetadata('field', field, obj);
	}
}