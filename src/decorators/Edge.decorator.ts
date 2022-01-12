import {getDocumentForContainer} from '../models'
import {isActive} from '../index'

/**
 * Edge is currently an alias of Document
 */
export function Edge(): ClassDecorator {
  return (prototype: any) => {
    if(!isActive) return
    const doc = getDocumentForContainer(prototype)
    doc.makeEdge()
    doc.complete()
    return prototype
  }
}