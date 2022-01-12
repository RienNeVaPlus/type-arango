import {isActive} from '../index'
import {getDocumentForContainer} from '../models'
import {ClassAndPropertyDecorator, DocumentData, EventType, DecoratorId, EventMethod} from '../types'
import {SymbolKeysNotSupportedError} from '../errors'

type Cancel = string | false
type Passive = true | ArangoDB.HttpStatus

interface Opt { method: EventMethod }

// document
interface OptBeforeDocumentClass extends Opt { _key: string }
interface OptAfterDocumentClass extends OptBeforeDocumentClass { document: DocumentData }
interface OptBeforeDocumentProp extends OptBeforeDocumentClass { attribute: string }
interface OptAfterDocumentProp extends OptBeforeDocumentProp { document: string }

type BeforeDocumentClass = (loadDocumentKey: string, opt: OptBeforeDocumentClass) => Passive | Cancel
type AfterDocumentClass = (loadedDocument: DocumentData, opt: OptAfterDocumentClass) => Passive | Cancel | DocumentData
type BeforeDocumentProp = (loadDocumentKey: string, opt: OptBeforeDocumentProp) => void
type AfterDocumentProp = (attributeValue: string, opt: OptAfterDocumentProp) => any

type BeforeDocumentResolver = BeforeDocumentClass | BeforeDocumentProp
type AfterDocumentResolver = AfterDocumentClass | AfterDocumentProp
type ResolverDocument = BeforeDocumentResolver | AfterDocumentResolver

// insert
interface OptBeforeInsertClass extends Opt { json: DocumentData }
interface OptAfterInsertClass extends Opt { _key: string, document: DocumentData }
interface OptBeforeInsertProp extends OptBeforeInsertClass { attribute: string }
interface OptAfterInsertProp extends OptAfterInsertClass { attribute: string }

type BeforeInsertClass = (insertDocument: DocumentData, opt: OptBeforeInsertClass) => Passive | Cancel | DocumentData
type AfterInsertClass = (insertedDocument: DocumentData, opt: OptAfterInsertClass) => Passive | Cancel | DocumentData
type BeforeInsertProp = (insertAttributeValue: string, opt: OptBeforeInsertProp) => any
type AfterInsertProp = (insertedAttributeValue: string, opt: OptAfterInsertProp) => any

type BeforeInsertResolver = BeforeInsertClass | BeforeInsertProp
type AfterInsertResolver = AfterInsertClass | AfterInsertProp
type ResolverInsert = BeforeInsertResolver | AfterInsertResolver

// update | replace | modify | write
interface OptBeforeModifyClass extends Opt { _key: string, json: DocumentData }
interface OptAfterModifyClass extends Opt { _key: string, document: DocumentData }
interface OptBeforeModifyProp extends OptBeforeModifyClass { attribute: string }
interface OptAfterModifyProp extends OptAfterModifyClass { attribute: string }

// modify
type BeforeModifyClass = (modifyDocument: DocumentData, opt: OptBeforeModifyClass) => Passive | Cancel | DocumentData
type AfterModifyClass = (modifiedDocument: DocumentData, opt: OptAfterModifyClass) => Passive | Cancel | DocumentData
type BeforeModifyProp = (modifyAttributeValue: string, opt: OptBeforeModifyProp) => any
type AfterModifyProp = (modifiedAttributeValue: string, opt: OptAfterModifyProp) => any

type BeforeModifyResolver = BeforeModifyClass | BeforeModifyProp
type AfterModifyResolver = AfterModifyClass | AfterModifyProp
type ResolverModify = BeforeModifyResolver | AfterModifyResolver

// write
type BeforeWriteClass = (writeDocument: DocumentData, opt: OptBeforeModifyClass | OptBeforeInsertClass) => Passive | Cancel | DocumentData
type AfterWriteClass = (writtenDocument: DocumentData, opt: OptAfterModifyClass | OptAfterInsertClass) => Passive | Cancel | DocumentData
type BeforeWriteProp = (writeAttributeValue: string, opt: OptBeforeModifyProp | OptBeforeInsertProp) => any
type AfterWriteProp = (writtenAttributeValue: string, opt: OptAfterModifyProp | OptAfterInsertProp) => any

type BeforeWriteResolver = BeforeWriteClass | BeforeWriteProp
type AfterWriteResolver = AfterWriteClass | AfterWriteProp
type ResolverWrite = BeforeWriteResolver | AfterWriteResolver

// update
type BeforeUpdateClass = (updateDocument: DocumentData, opt: OptBeforeModifyClass) => Passive | Cancel | DocumentData
type AfterUpdateClass = (updatedDocument: DocumentData, opt: OptAfterModifyClass) => Passive | Cancel | DocumentData
type BeforeUpdateProp = (updateAttributeValue: string, opt: OptBeforeModifyProp) => any
type AfterUpdateProp = (updatedAttributeValue: string, opt: OptAfterModifyProp) => any

type BeforeUpdateResolver = BeforeUpdateClass | BeforeUpdateProp
type AfterUpdateResolver = AfterUpdateClass | AfterUpdateProp
type ResolverUpdate = BeforeUpdateResolver | AfterUpdateResolver

// replace
type BeforeReplaceClass = (replaceDocument: DocumentData, opt: OptBeforeModifyClass) => Passive | Cancel | DocumentData
type AfterReplaceClass = (replacedDocument: DocumentData, opt: OptAfterModifyClass) => Passive | Cancel | DocumentData
type BeforeReplaceProp = (replaceAttributeValue: string, opt: OptBeforeModifyProp) => any
type AfterReplaceProp = (replacedAttributeValue: string, opt: OptAfterModifyProp) => any

type BeforeReplaceResolver = BeforeReplaceClass | BeforeReplaceProp
type AfterReplaceResolver = AfterReplaceClass | AfterReplaceProp
type ResolverReplace = BeforeReplaceResolver | AfterReplaceResolver

// remove
interface OptBeforeRemoveClass extends Opt { _key: string }
interface OptAfterRemoveClass extends OptBeforeRemoveClass { old: DocumentData }
interface OptBeforeRemoveProp extends OptBeforeRemoveClass { attribute: string }
interface OptAfterRemoveProp extends OptAfterRemoveClass { attribute: string }

type BeforeRemoveClass = (removeDocumentKey: string, opt: OptBeforeRemoveClass) => Passive | Cancel
type AfterRemoveClass = (removedDocumentKey: string, opt: OptAfterRemoveClass) => Passive
type BeforeRemoveProp = (removeDocumentKey: string, opt: OptBeforeRemoveProp) => void
type AfterRemoveProp = (removedDocumentKey: string, opt: OptAfterRemoveProp) => void

type BeforeRemoveResolver = BeforeRemoveClass | BeforeRemoveProp
type AfterRemoveResolver = AfterRemoveClass | AfterRemoveProp
type ResolverRemove = BeforeRemoveResolver | AfterRemoveResolver

type Resolver = ResolverDocument | ResolverInsert | ResolverUpdate | ResolverReplace | ResolverModify | ResolverWrite | ResolverRemove

function on(
  event: EventType,
  resolver: Resolver
): ClassAndPropertyDecorator {
  return function(prototype: any, attribute?: string | symbol): any {
    if (!isActive) return
    if(typeof attribute === 'symbol')
      throw new SymbolKeysNotSupportedError()

    getDocumentForContainer(attribute ? prototype.constructor : prototype)
      .decorate(event+'.'+(attribute?'prop':'class') as DecoratorId, {
        prototype, attribute, resolver
      })

    if(!attribute)
      return prototype
  }
}

export const Before = {
  document: (resolver: BeforeDocumentResolver) => on('Before.document', resolver),
  insert: (resolver: BeforeInsertResolver) => on('Before.insert', resolver),
  update: (resolver: BeforeUpdateResolver) => on('Before.update', resolver),
  replace: (resolver: BeforeReplaceResolver) => on('Before.replace', resolver),
  modify: (resolver: BeforeModifyResolver) => on('Before.modify', resolver), // update + replace
  write: (resolver: BeforeInsertResolver) => on('Before.write', resolver), // insert + update + replace
  remove: (resolver: BeforeRemoveResolver) => on('Before.remove', resolver)
}

export const After = {
  document: (resolver: AfterDocumentResolver) => on('After.document', resolver),
  insert: (resolver: AfterInsertResolver) => on('After.insert', resolver),
  update: (resolver: AfterUpdateResolver) => on('After.update', resolver),
  replace: (resolver: AfterReplaceResolver) => on('After.replace', resolver),
  modify: (resolver: AfterModifyResolver) => on('After.modify', resolver), // update + replace
  write: (resolver: AfterReplaceResolver) => on('After.write', resolver), // insert + update + replace
  remove: (resolver: AfterRemoveResolver) => on('After.remove', resolver)
}