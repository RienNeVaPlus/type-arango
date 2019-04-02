import {getCollectionForContainer} from '../models';
import {isActive} from '../index';
import {SymbolKeysNotSupportedError} from '../errors';
import {argumentResolve} from '../utils';
import {Roles, RolesFunc} from '../types';

export function Authorized(): PropertyDecorator;
export function Authorized(readers: Roles): PropertyDecorator;
export function Authorized(readers: Roles, writers: Roles): PropertyDecorator;
export function Authorized(readersFunction: RolesFunc): PropertyDecorator;
export function Authorized(readersFunction: RolesFunc, writers: Roles): PropertyDecorator;
export function Authorized(readersFunction: RolesFunc, writersFunction: RolesFunc): PropertyDecorator;
export function Authorized(readers: Roles, writersFunction: RolesFunc): PropertyDecorator;
export function Authorized(
	readersOrFunction: Roles | RolesFunc = [],
	writersOrFunction: Roles | RolesFunc = []
): PropertyDecorator {
	return (prototype, propertyKey) => {
		if(!isActive) return;
		if(typeof propertyKey === 'symbol')
			throw new SymbolKeysNotSupportedError();

		const col = getCollectionForContainer(prototype.constructor);

		col.addMetadata('field', propertyKey, {
			authorized: {
				readers: argumentResolve(readersOrFunction),
				writers: argumentResolve(writersOrFunction)
			}
		});
		return;
	}
}