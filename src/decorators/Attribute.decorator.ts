import {getDocumentForContainer} from '../models'
import {SymbolKeysNotSupportedError} from '../errors'
import {Roles, TypeFunc, ValidateSchema, ValidateSchemaFunc} from '../types'
import {isActive} from '../index'

type ReadersFunc = (groups: void) => Roles
type WritersFunc = (groups: void) => Roles
type RequiredFunc = (a?: any) => true
type Required = RequiredFunc | true

export function Attribute(): PropertyDecorator
export function Attribute(required: Required): PropertyDecorator
export function Attribute(schemaOrReadersOrFunction: ValidateSchema | ValidateSchemaFunc | ReadersFunc | Roles): PropertyDecorator
export function Attribute(
  schemaOrFunction: ValidateSchema | ValidateSchemaFunc | ReadersFunc | Roles,
  readersArrayOrFunction: WritersFunc | ReadersFunc | Roles
): PropertyDecorator
export function Attribute(
  readersArrayOrFunction: ReadersFunc | Roles,
  writersArrayOrFunction?: WritersFunc | Roles
): PropertyDecorator
export function Attribute(
  schemaOrFunction: ValidateSchema | ValidateSchemaFunc,
  readersArrayOrFunction: ReadersFunc | Roles,
  writersArrayOrFunction?: WritersFunc | Roles
): PropertyDecorator
export function Attribute(
  typeOrRequiredOrSchemaOrReadersOrFunction?: Required | TypeFunc | ValidateSchema | ValidateSchemaFunc | ReadersFunc | Roles,
  readersArrayOrFunction?: ReadersFunc | Roles,
  writersArrayOrFunction?: WritersFunc | Roles
): PropertyDecorator {
  return (prototype: any, attribute: string | symbol) => {
    if(!isActive) return
    if(typeof attribute === 'symbol')
      throw new SymbolKeysNotSupportedError()

    getDocumentForContainer(prototype.constructor).decorate('Attribute', {
      prototype, attribute, typeOrRequiredOrSchemaOrReadersOrFunction, readersArrayOrFunction, writersArrayOrFunction
    })
  }
}
