import {getCollectionForContainer} from '../models';
import {isActive} from '../index';
import {SymbolKeysNotSupportedError} from '../errors';
import {argumentResolve, enjoi, removeUndefined, toJoi} from '../utils';
import {FieldMetadata, Roles, ValidateSchema, ValidateSchemaFunc} from '../types';

type ReadersFunc = (returns?: void) => Roles;
type WritersFunc = (returns?: void) => Roles;

export function Field(): PropertyDecorator;
export function Field(inputSchemaOrFunction: ValidateSchema | ValidateSchemaFunc): PropertyDecorator;
export function Field(readersArrayOrFunction: ReadersFunc | Roles): PropertyDecorator;
export function Field(
	inputSchemaOrFunction: ValidateSchema | ValidateSchemaFunc,
	readersArrayOrFunction: ReadersFunc | Roles
): PropertyDecorator;
export function Field(
	readersArrayOrFunction: ReadersFunc | Roles,
	writersArrayOrFunction?: WritersFunc | Roles
): PropertyDecorator;
export function Field(
	inputSchemaOrFunction: ValidateSchema | ValidateSchemaFunc,
	readersArrayOrFunction: ReadersFunc | Roles,
	writersArrayOrFunction?: WritersFunc | Roles
): PropertyDecorator;
export function Field(
	inputSchemaOrReadersOrFunction?: ValidateSchema | ValidateSchemaFunc | ReadersFunc | Roles,
	readersArrayOrFunction?: ReadersFunc | Roles,
	writersArrayOrFunction?: WritersFunc | Roles
): PropertyDecorator {
	return (prototype, field) => {
		if(!isActive) return;
		if(typeof field === 'symbol')
			throw new SymbolKeysNotSupportedError();

		const col = getCollectionForContainer(prototype.constructor);
		const metadata = Reflect.getMetadata('design:type', prototype, field);
		const joi = toJoi(metadata);

		let schema = argumentResolve(inputSchemaOrReadersOrFunction, joi, enjoi) || joi;
		let readers = argumentResolve(readersArrayOrFunction);
		let writers = argumentResolve(writersArrayOrFunction);

		if(Array.isArray(schema)){
			writers = readers;
			readers = schema;
			schema = joi;
		}

		let obj: FieldMetadata = {
			metadata,
			schema
		};
		if(readers) obj.roles = removeUndefined({readers:readers,writers});
		col.addMetadata('field', field, obj);
	}
}
