import {getDocumentForContainer} from '../models'
import {SymbolKeysNotSupportedError} from '../errors'
import {Class, TypeFn} from '../types'
import {isActive} from '../index'

/**
 * Replace type argument with metadata as soon as https://github.com/Microsoft/TypeScript/issues/7169 is resolved
 */
export function OneToOne(type?: Class | TypeFn, relation?: (type: any) => string): PropertyDecorator {
  return (prototype: any, attribute: string | symbol) => {
    if(!isActive) return
    if(typeof attribute === 'symbol')
      throw new SymbolKeysNotSupportedError()

    getDocumentForContainer(prototype.constructor).decorate('OneToOne', {
      prototype, attribute, type, relation
    })
  }
}
