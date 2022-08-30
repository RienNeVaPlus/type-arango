import {DocumentData, QueryOpt} from '../types'
import {getCollectionForContainer} from './Collection.model'

function mapToInstances<T>(Class: new(doc: DocumentData, docIsSync: boolean) => T, results: any[]) {
  return results.map((r: any) => new Class(r, true))
}

export class Entities {
  constructor(doc?: DocumentData) {
    if(doc) Object.assign(this, doc)
  }

  static get _col(){
    return getCollectionForContainer(this)
  }

  static get _db(){
    return this._col.db
  }

  static _mapToInstances(results: any[]) {
    return mapToInstances(this._col.doc!.Class, results)
  }

  static filter(options: QueryOpt = {}): any[] {
    return this._mapToInstances(this._col.query(options).toArray())
  }

  static find(keyOrOptions: QueryOpt | string | number, options: QueryOpt = {}): any {
    if(typeof keyOrOptions === 'string' || typeof keyOrOptions === 'number')
      options = Object.assign(options, {filter:{_key:keyOrOptions}})
    else if(keyOrOptions)
      options = keyOrOptions

    return this.filter(Object.assign(options, {limit:1}))[0]
  }

  // static async save(_key: string, _doc: any){}
  // static async remove(_key: string){}
}