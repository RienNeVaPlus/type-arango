import {getDocumentForContainer} from '../models'
import {isActive} from '../index'
import {SymbolKeysNotSupportedError} from '../errors'
import {Roles, RolesFunc} from '../types'

export function Authorized(): PropertyDecorator
export function Authorized(readers: Roles): PropertyDecorator
export function Authorized(readers: Roles, writers: Roles): PropertyDecorator
export function Authorized(readersFunction: RolesFunc): PropertyDecorator
export function Authorized(readersFunction: RolesFunc, writers: Roles): PropertyDecorator
export function Authorized(readersFunction: RolesFunc, writersFunction: RolesFunc): PropertyDecorator
export function Authorized(readers: Roles, writersFunction: RolesFunc): PropertyDecorator
export function Authorized(
  readersArrayOrFunction: Roles | RolesFunc = [],
  writersArrayOrFunction: Roles | RolesFunc = []
): PropertyDecorator {
  return (prototype: any, attribute: string | symbol) => {
    if(!isActive) return
    if(typeof attribute === 'symbol')
      throw new SymbolKeysNotSupportedError()

    getDocumentForContainer(prototype.constructor).decorate('Authorized', {
      prototype, attribute, readersArrayOrFunction, writersArrayOrFunction
    })
  }
}