import {getDocumentForContainer, Document} from '.'
import {DocumentData} from '../types'
import {AttributeNotInEntityError, MissingKeyError, AttributeIsNotARelationError, SymbolKeysNotSupportedError} from '../errors'
import {db, isFoxx} from '../utils'

// const nativeKeys = ['constructor','toString']
const unenumerable = ['_saveKeys', '_collection', '_relations']
const globalAttributes = ['_key', '_rev', '_id', '_oldRev']
const accessibleKeys = globalAttributes.concat('_saveKeys')

interface SaveOptions extends ArangoDB.UpdateOptions, ArangoDB.InsertOptions {
  update: boolean
}

export class Entity {
  public _collection: ArangoDB.Collection
  public _saveKeys: string[] = []

  public _id?: string
  public _key?: string
  public _rev?: string

  public _from?: string | any
  public _to?: string | any

  [key: string]: any

  static get _doc(){
    return getDocumentForContainer(this)
  }

  static get _db(){
    return db
  }

  get _doc() {
    return (this.constructor as typeof Entity)._doc as Document
  }

  static get _relations(){
    return Object.keys(this._doc.relation)
  }

  constructor(doc?: DocumentData | string, docIsSync: boolean = false) {
    if(typeof doc === 'string')
      doc = {_key:doc}

    if(doc){
      if(!docIsSync) this._saveKeys = Object.keys(doc).filter(k => (this as any)[k] !== (doc as DocumentData)[k])
      this.merge(doc)
    }

    const { _doc } = this
    const constructor = (this.constructor as typeof Entity)
    const attribute = _doc.attribute
    const keys = Object.keys(attribute).concat(accessibleKeys)

    this._collection = isFoxx() ? _doc.col!.db : {} as any

    if(!isFoxx()){
      return this
    }

    // hide some attrs
    unenumerable.forEach(attr => Object.defineProperty(this, attr, {enumerable:false}))

    // setup proxy
    return new Proxy(this, {
      // get(target: any, key: string){
      //   if(nativeKeys.includes(key)) return target[key]
      //
      //   // const cleanKey = key.startsWith('_') ? key.substr(1) : key
      //
      //   // // return relation values as entity._attribute
      //   // if(key.startsWith('_') && _doc.relation[cleanKey]){
      //   //   return target[cleanKey]
      //   // }
      //   //
      //   // // support relation entity load via entity.relation()
      //   // if(_doc.relation[key]) return _doc.resolveRelation.bind(_doc, target, key)
      //
      //   return target[key]
      // },
      set(target: any, key: string, val: any){
        if(typeof key === 'symbol')
          throw new SymbolKeysNotSupportedError()

        if(_doc.relation[key]){
          target._saveKeys.push(key)
          target[key] = val
          return true
        }
        // check key
        else if(!keys.includes(String(key))) {
          throw new AttributeNotInEntityError(constructor.name, key)
        }
        // joi validation
        else if(attribute[key]){
          const {error, value} = attribute[key].schema!.validate(val)
          if(error) throw error
          val = value
        }

        if(target[key] === val) return true

        // set
        target._saveKeys.push(key)
        target[key] = val
        return true
      }
    })
  }

  /**
   * Returns related entity
   */
  related(attribute: string, attributes?: string[]) {
    if(!this._doc.relation[attribute])
      throw new AttributeIsNotARelationError(this.name, attribute)
    return this._doc.resolveRelation(this, attribute, attributes)
  }

  /**
   * Creates the document by using .save({update:false})
   */
  insert(){
    return this.save({update:false})
  }

  /**
   * Alias for insert
   * @deprecated
   */
  create(){
    console.warn('Using entity.create is deprecated, use entity.insert instead')
    return this.insert()
  }

  /**
   * Merges `obj` into `this`
   */
  merge(...obj: DocumentData[]){
    return Object.assign(this, ...obj)
  }

  /**
   * Converts entity to object (strips property listeners)
   */
  toObject(){
    return Object.assign({}, this)
  }

  /**
   * Saves changed attributes to database. Creates a new document when no _key is available.
   * Use the option {update:false} to always create a new document even when a _key is provided.
   */
  save(options: Partial<SaveOptions> = {}){
    const { _saveKeys, _key, _doc, _collection } = this

    if(options.update === undefined) options.update = true

    if(!_saveKeys.length)
      return this

    // accumulate changed values from _saveKeys into object
    let data = _saveKeys.reduce((o: any, key: string) => {
      const v = this[key]

      const relation = _doc.relation[key]
      if(relation){
        // save assigned entity
        if(v instanceof Entity && v._saveKeys.length) v.save()
        o[key] = v instanceof Entity ? v._key : v
      }
      else
        o[key] = v

      return o
    }, {})
    let res

    // insert / update
    if(options.update && _key) {
      data = _doc.emitBefore('update', data)
      res = _doc.emitAfter('insert', _collection.update({_key}, data, options) )
    }
    else {
      data = _doc.emitBefore('insert', data)
      res = _doc.emitAfter('insert', _collection.insert(data, Object.assign(options, {returnNew:true})).new )
    }

    this.merge(res)

    // reset
    this._saveKeys = []

    return this
  }

  /**
   * Replaces the document with the provided doc, ignoring _saveKeys
   */
  replace(doc: DocumentData, options?: ArangoDB.ReplaceOptions){
    const { _key, _doc, _collection } = this

    if(!_key)
      throw new MissingKeyError(this.constructor.name)

    doc = _doc.emitBefore('replace', doc)
    return this.merge( _doc.emitAfter('insert', _collection.replace({_key}, doc, options) ))
  }

  /**
   * Removes the document
   */
  remove(options?: ArangoDB.RemoveOptions){
    const { _key, _doc, _collection } = this

    if(!_key)
      throw new MissingKeyError(this.constructor.name)

    _doc.emitBefore('remove', _key)
    return this.merge(_doc.emitAfter('remove', _collection.remove({_key}, options)))
  }
}