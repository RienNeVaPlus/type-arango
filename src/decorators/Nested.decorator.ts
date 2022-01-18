import {getDocumentForContainer} from '../models'
import {isActive} from '../index'

/**
 * Nested is currently an alias of Document
 */
export function Nested(
  insideDocument?: () => any
): ClassDecorator {
  return (prototype: any) => {
    if(!isActive) return
    const doc = getDocumentForContainer(prototype)
    doc.decorate('Nested', {prototype, insideDocument})
    return prototype
  }
}