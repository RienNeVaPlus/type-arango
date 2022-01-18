import {getDocumentForContainer} from '../models'
import {SymbolKeysNotSupportedError} from '../errors'
import {Roles, TypeFn, ValidateSchema, ValidateSchemaFn} from '../types'
import {isActive} from '../index'

type ReadersFn = (groups: void) => Roles
type WritersFn = (groups: void) => Roles
type RequiredFn = (a?: any) => true
type Required = RequiredFn | true

export function Attribute(): PropertyDecorator
export function Attribute(required: Required): PropertyDecorator
export function Attribute(schemaOrReaders: ValidateSchema | ValidateSchemaFn | ReadersFn | Roles): PropertyDecorator
export function Attribute(
  schema: ValidateSchema | ValidateSchemaFn | ReadersFn | Roles,
  readersArray: WritersFn | ReadersFn | Roles
): PropertyDecorator
export function Attribute(
  readersArray: ReadersFn | Roles,
  writersArray?: WritersFn | Roles
): PropertyDecorator
export function Attribute(
  schema: ValidateSchema | ValidateSchemaFn,
  readersArray: ReadersFn | Roles,
  writersArray?: WritersFn | Roles
): PropertyDecorator
export function Attribute(
  typeOrRequiredOrSchemaOrReaders?: Required | TypeFn | ValidateSchema | ValidateSchemaFn | ReadersFn | Roles,
  readersArray?: ReadersFn | Roles,
  writersArray?: WritersFn | Roles
): PropertyDecorator {
  return (prototype: any, attribute: string | symbol) => {
    if(!isActive) return
    if(typeof attribute === 'symbol')
      throw new SymbolKeysNotSupportedError()

    getDocumentForContainer(prototype.constructor).decorate('Attribute', {
      prototype, attribute, typeOrRequiredOrSchemaOrReaders, readersArray, writersArray
    })
  }
}
