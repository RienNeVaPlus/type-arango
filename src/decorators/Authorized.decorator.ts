import {getDocumentForContainer} from '../models'
import {isActive} from '../index'
import {SymbolKeysNotSupportedError} from '../errors'
import {Roles, RolesFn} from '../types'

export function Authorized(): PropertyDecorator
export function Authorized(readers: Roles): PropertyDecorator
export function Authorized(readers: Roles, writers: Roles): PropertyDecorator
export function Authorized(readersFn: RolesFn): PropertyDecorator
export function Authorized(readersFn: RolesFn, writers: Roles): PropertyDecorator
export function Authorized(readersFn: RolesFn, writersFn: RolesFn): PropertyDecorator
export function Authorized(readers: Roles, writersFn: RolesFn): PropertyDecorator
export function Authorized(
  readersArray: Roles | RolesFn = [],
  writersArray: Roles | RolesFn = []
): PropertyDecorator {
  return (prototype: any, attribute: string | symbol) => {
    if(!isActive) return
    if(typeof attribute === 'symbol')
      throw new SymbolKeysNotSupportedError()

    getDocumentForContainer(prototype.constructor).decorate('Authorized', {
      prototype, attribute, readersArray, writersArray
    })
  }
}