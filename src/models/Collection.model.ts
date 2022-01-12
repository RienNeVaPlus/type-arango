import {Joi} from '../joi'
import {collections, config, isActive, logger} from '..'
import {Document, getDocumentForContainer, Route as RouteModel, Scalar} from './index'
import {argumentResolve, arraySample, concatUnique, db, enjoi, isObject, queryBuilder} from '../utils'
import {
  CreateCollectionOptions,
  DecoratorId,
  DecoratorStorage,
  QueryOpt,
  Roles,
  RouteOpt,
  RoutePathParam,
  SchemaStructure
} from '../types'
import {getRouteForCollection} from '.'

export type RoleTypes = 'creators' | 'readers' | 'updaters' | 'deleters'

export interface CollectionRoles {
  creators: Roles
  readers: Roles
  updaters: Roles
  deleters: Roles
}

const METHODS_BODYLESS = ['get', 'delete']

/**
 * Creates a new Collection for a decorated class
 */
function createCollectionFromContainer(someClass: any): Collection {
  let c = new Collection(someClass)
  collections.push(c)
  return c
}

/**
 * Finds a collection for a decorated class
 */
export function findCollectionForContainer(someClass: any): Collection | undefined {
  return collections.find(c => someClass === c.Class || someClass.prototype instanceof c.Class)
}

/**
 * Returns the respective collection instance for a decorated class
 */
export function getCollectionForContainer(someClass: any): Collection {
  let col = findCollectionForContainer(someClass)
  if(col) return col
  return createCollectionFromContainer(someClass)
}

/**
 * Collections represent tables in ArangoDB
 */
export class Collection {
  public name: string
  public db: ArangoDB.Collection
  public completed: boolean = false
  public opt?: CreateCollectionOptions
  public schema: SchemaStructure = {}
  public routes: RouteModel[] = []
  public roles: CollectionRoles = {
    creators: [],
    readers: [],
    updaters: [],
    deleters: []
  }
  public doc?: Document<any>
  private decorator: DecoratorStorage = {}

  /**
   * Returns a valid collection name
   */
  static toName(input: string){
    return config.prefixCollectionName ? module.context.collectionName(input) : input
  }

  /**
   * Creates a new collection instance
   */
  constructor(public Class: any){
    this.name = Collection.toName(Class.name)
    this.db = isActive ? db._collection(this.name) : null
  }

  /**
   * Whether users can provide custom document keys on creation
   */
  public get allowUserKeys(){
    const keyOptions = this.opt && this.opt.keyOptions
    return !keyOptions ? false : (keyOptions && keyOptions.allowUserKeys === true && keyOptions.type !== 'autoincrement')
  }

  public get route(){
    let { name } = this
    name = name.charAt(0).toLowerCase() + name.substr(1)

    if(config.dasherizeRoutes)
      name = name.replace(/[A-Z]/g, m => '-' + m.toLowerCase())

    return name
  }

  public addRoles(key: RoleTypes, roles: Roles, onlyWhenEmpty: boolean = true){
    if(onlyWhenEmpty && this.roles[key].length) return
    this.roles[key] = concatUnique(this.roles[key], roles)
    if(this.doc) this.doc!.roles = concatUnique(this.doc!.roles, roles)
    // else console.log('CANNOT ADD ROLES, DOCUMENT NOT READY')
  }

  public decorate(decorator: DecoratorId, data: any){
    this.decorator[decorator] = [...(this.decorator[decorator]||[]), {...data,decorator}]
  }

  get routeAuths(){
    return (this.decorator['Route.auth']||[]).map(d => d.authorizeFunction).reverse()
  }

  get routeRoles(){
    return (this.decorator['Route.roles']||[]).map(d => d.rolesFunction).reverse()
  }

  query(q: string | QueryOpt){
    if(typeof q === 'string'){
      return db._query(q)
    }

    if(!q.keep){
      q.unset = []
      if(config.stripDocumentId) q.unset.push('_id')
      if(config.stripDocumentRev) q.unset.push('_rev')
      if(config.stripDocumentKey) q.unset.push('_key')
    }

    return db._query(queryBuilder(this.name, q))
  }

  finalize(){
    const { Collection, Route, Task, Function } = this.decorator

    let { ofDocument, options = {} } = Collection![0]
    this.opt = options

    if(options.name) {
      this.name = options.name
    }

    const doc = this.doc = getDocumentForContainer(argumentResolve(ofDocument))
    doc.col = this

    if(options.creators) this.addRoles('creators', options.creators, false)
    if(options.readers) this.addRoles('readers', options.readers, false)
    if(options.updaters) this.addRoles('updaters', options.updaters, false)
    if(options.deleters) this.addRoles('deleters', options.deleters, false)

    if(isActive){
      // create collection
      if(!this.db){
        logger.info('Creating ArangoDB Collection "%s"', this.name)
        const { of, creators, readers, updaters, deleters, roles, auth, routes, ...opt } = options
        this.db = doc.isEdge
          ? db._createEdgeCollection(this.name, opt || {})
          : db._createDocumentCollection(this.name, opt || {})
      }

      // create indices
      for(let {options} of doc.indexes!){
        this.db.ensureIndex(options)
      }

      const task = require('@arangodb/tasks')
      const tasks = task.get()

      // setup Tasks
      if(Task) for(let {
        prototype, attribute, period, offset, id, name, params
      } of Task){
        if(tasks.find((t: any) => t.id === id)){
          logger.debug('Unregister previously active task', id)
          task.unregister(id)
        }

        const opt: any = {
          id,
          offset,
          name,
          params
        }

        eval('opt.command = function '+prototype[attribute!].toString())

        if(period > 0)
          opt.period = period

        logger.debug('Register task', opt)
        task.register(opt)
      }


      const aqlfunction = require('@arangodb/aql/functions')

      // unregister old
      if(config.unregisterAQLFunctionEntityGroup){
        logger.debug('Unregister AQLFunction-group "'+this.name+'::*"')
        aqlfunction.unregisterGroup(this.name)
      }

      // setup AQLFunctions
      if(Function) for(let {
        prototype, attribute, name, isDeterministic
      } of Function){
        logger.debug('Register AQLFunction "'+name+'"')
        let f = null
        eval('f = function '+prototype[attribute!].toString())
        aqlfunction.register(name, f, isDeterministic)
      }
    }

    if(Route) for(let {
      prototype, attribute, method, pathOrRolesOrFunctionOrOptions, schemaOrRolesOrSummaryOrFunction,
      rolesOrSchemaOrSummaryOrFunction, summaryOrSchemaOrRolesOrFunction, options
    } of Route){
      let schema: any
      const a: any = argumentResolve(pathOrRolesOrFunctionOrOptions, (inp: any) => enjoi(inp, 'required'), Joi)
      let opt: RouteOpt = Object.assign({
          queryParams: []
        },
        typeof a === 'string'
            ? {path:a}
          : Array.isArray(a)
            ? {roles:a}
          : typeof a === 'object' && a && !a.method
            ? {schema:a.isJoi ? a : enjoi(a)}
          : a || {}
      )

      // allow options for schema param
      if(isObject(schemaOrRolesOrSummaryOrFunction)){
        opt = Object.assign(schemaOrRolesOrSummaryOrFunction, opt)
      } else {
        schema = argumentResolve(schemaOrRolesOrSummaryOrFunction, (inp: any) => enjoi(inp, 'required'), Joi)

        if(schema instanceof Array){
          opt.roles = schema
        } else if(typeof schema === 'string'){
          opt.summary = schema
        } else if(typeof schema === 'object' && schema){

        } else schema = null
      }

      // allow options for roles param
      if(isObject(rolesOrSchemaOrSummaryOrFunction)){
        opt = Object.assign(rolesOrSchemaOrSummaryOrFunction, opt)
      } else {
        let roles = argumentResolve(rolesOrSchemaOrSummaryOrFunction, (inp: any) => enjoi(inp, 'required'), Joi)

        if(roles instanceof Array){
          opt.roles = roles
        } else if(typeof roles === 'string'){
          opt.summary = roles
        } else if(typeof roles === 'object' && roles) {
          schema = roles
        }
      }

      // allow options for summary param
      if(isObject(summaryOrSchemaOrRolesOrFunction)){
        opt = Object.assign(summaryOrSchemaOrRolesOrFunction, opt)
      } else {
        let summary = argumentResolve(summaryOrSchemaOrRolesOrFunction, (inp: any) => enjoi(inp, 'required'), Joi)
        if(summary instanceof Array){
          opt.roles = summary
        } else if(typeof summary === 'string'){
          opt.summary = summary
        } else if(typeof summary === 'object' && summary) {
          schema = summary
        }
      }

      if(options)
        opt = Object.assign(options, opt)

      if(!schema && opt.schema){
        schema = argumentResolve(opt.schema, (inp: any) => enjoi(inp, 'required'), Joi)
      }

      if(method === 'LIST'){
        method = 'get'
        opt.action = 'list'
      } else method = method.toLowerCase()

      opt = RouteModel.parsePath(opt, this.route)

      if(schema) {
        if(schema.isJoi){}
        else {
          // support anonymous object syntax (joi => ({my:'object'}))
          schema = enjoi(schema) as typeof Joi
        }

        // treat schema as queryParam or pathParam
        if(schema._type === 'object'){
          // allow optional request body but default to required()
          schema = schema._flags.presence === 'optional' ? schema : schema.required()

          // init params
          opt.pathParams = opt.pathParams || []
          opt.queryParams = opt.queryParams || []

          let i = 0

          // loop schema keys
          for(const attr of schema._inner.children){
            // attributes with a default value are optional
            if(attr.schema._flags.default){
              attr.schema._flags.presence = 'optional'
            }

            // check schema attr in pathParams
            if(opt.pathParams.find(p => p[0] === attr.key)){
              // override pathParam schema with route schema in order to specify more details
              opt.pathParams = opt.pathParams.map(p => p[0] === attr.key ? [p[0], attr.schema, p[2]] as RoutePathParam : p)
              // remove attr from schema
              schema._inner.children = schema._inner.children.filter((a: any) => a.key !== attr.key)
              continue
            } else if(opt.queryParams.find(q => q[0] === attr.key)){
              // override queryParam schema with route schema in order to specify more details
              opt.queryParams = opt.queryParams.map(p => p[0] === attr.key ? [p[0], attr.schema, p[2]] as RoutePathParam : p)
              // remove attr from schema
              schema._inner.children = schema._inner.children.filter((a: any) => a.key !== attr.key)
            } else {
              i++
            }

            if(METHODS_BODYLESS.includes(method)){
              const isRequired = attr.schema._flags.presence === 'required'
              const operators = attr.schema._flags.operators

              opt.queryParams.push([
                attr.key,
                attr.schema,
                Scalar.iconRequired(isRequired) + ' ' + (attr.schema._description ? '**'+attr.schema._description+'**' : (isRequired
                    ? '**Required'
                    : '**Optional'
                ) + ` query parameter** ${operators ? 'with operator': ''}  \`[ ${attr.key}: ${operators ? '[operator, value]' : attr.schema._type} ]\``)
                + (operators ? `
  　 \`Operators: ${operators.join(', ')}\`` : '')
                + `
        　 \`Example: ?${attr.key}=${operators ? arraySample(operators)+config.paramOperatorSeparator:''}${attr.schema._examples[0] || attr.schema._type}\``
              ])
            }
          }

          if(!METHODS_BODYLESS.includes(method) && i){
            opt.body = [schema]
          }
          // if(i && !ROUTEmethod !== 'get' && method !== 'delete'){
          //   opt.body = [schema]
          // }
        }
      }

      // is MethodDecorator, replace callback with method
      if(attribute) {
        opt.handler = prototype[attribute]
        opt.handlerName = attribute
      }

      getRouteForCollection(method, opt, this)
    }

    this.completed = true
    // this.complete()
    logger.info('Completed collection "%s"', this.name)
  }
}