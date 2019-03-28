import {getFromContainer} from '../models';
import {isActive} from '../index';
import {SymbolKeysNotSupportedError} from '../errors';
import {Roles, RolesFunc} from '../models/types';
import {argumentResolve} from '../utils';

export function Authorized(
	readersOrFunction: Roles | RolesFunc = [],
	writersOrFunction: Roles | RolesFunc = []
): PropertyDecorator {
	return (prototype, propertyKey) => {
		if(!isActive) return;
		if(typeof propertyKey === 'symbol')
			throw new SymbolKeysNotSupportedError();

		getFromContainer(prototype.constructor).addMetadata('field', propertyKey, {
			authorized: {readers:argumentResolve(readersOrFunction), writers:argumentResolve(writersOrFunction)}
		});
		return;
	}
}