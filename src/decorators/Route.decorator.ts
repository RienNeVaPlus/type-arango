import {isActive} from '../index'
import {getCollectionForContainer} from '../models'
import {argumentResolve} from '../utils'
import {
  ClassAndMethodDecorator,
  Roles,
  RolesFunc,
  RouteAuth,
  RouteDecorator,
  RouteOpt, RoutePreset,
  RouteRoles,
  SchemaFunc
} from '../types'
import {SymbolKeysNotSupportedError} from '../errors'
import {Schema} from 'joi'

export type PathFunc = (returns?: string) => any
export type SummaryFunc = (returns?: string) => string

type ArgPathOrRolesOrOpt = string | PathFunc | Roles | RolesFunc | RouteOpt | SchemaFunc
type ArgSchemaOrRolesOrSummaryOrOpt = string | SummaryFunc | boolean | Schema | SchemaFunc | Roles | RolesFunc | RouteOpt

export const ROUTE_PRESET: {[key in RoutePreset]: RouteDecorator[]} = {
  '*': ['GET','POST','PATCH','PUT','DELETE','LIST'],
  'ALL': ['GET','POST','PATCH','PUT','DELETE'],
  'ALL+': ['GET','POST','PATCH','PUT','DELETE','LIST'],
  'CRUD': ['GET','POST','PATCH','DELETE'],
  'CRUD+': ['GET','POST','PUT','DELETE','LIST'],
}

export function route(
  method: RouteDecorator,
  pathOrRolesOrFunctionOrOptions?: ArgPathOrRolesOrOpt,
  schemaOrRolesOrSummaryOrFunction?: ArgSchemaOrRolesOrSummaryOrOpt,
  rolesOrSchemaOrSummaryOrFunction?: ArgSchemaOrRolesOrSummaryOrOpt,
  summaryOrSchemaOrRolesOrFunction?: ArgSchemaOrRolesOrSummaryOrOpt,
  options?: RouteOpt
): ClassAndMethodDecorator {
  return function(prototype: any, attribute?: string | symbol): any {
    if (!isActive) return
    if(typeof attribute === 'symbol')
      throw new SymbolKeysNotSupportedError()

    getCollectionForContainer(prototype).decorate('Route', {
      prototype, attribute, method, pathOrRolesOrFunctionOrOptions, schemaOrRolesOrSummaryOrFunction,
      rolesOrSchemaOrSummaryOrFunction, summaryOrSchemaOrRolesOrFunction, options
    })
    return prototype
  }
}

export const Route = {
  GET: (
    pathOrRolesOrFunctionOrOptions?: ArgPathOrRolesOrOpt,
    schemaOrRolesOrSummaryOrFunction?: ArgSchemaOrRolesOrSummaryOrOpt,
    rolesOrSchemaOrSummaryOrFunction?: ArgSchemaOrRolesOrSummaryOrOpt,
    summaryOrSchemaOrRolesOrFunction?: ArgSchemaOrRolesOrSummaryOrOpt,
    options?: RouteOpt
  ): ClassAndMethodDecorator => route('GET',
    pathOrRolesOrFunctionOrOptions,
    schemaOrRolesOrSummaryOrFunction,
    rolesOrSchemaOrSummaryOrFunction,
    summaryOrSchemaOrRolesOrFunction,
    options),
  POST: (
    pathOrRolesOrFunctionOrOptions?: ArgPathOrRolesOrOpt,
    schemaOrRolesOrSummaryOrFunction?: ArgSchemaOrRolesOrSummaryOrOpt,
    rolesOrSchemaOrSummaryOrFunction?: ArgSchemaOrRolesOrSummaryOrOpt,
    summaryOrSchemaOrRolesOrFunction?: ArgSchemaOrRolesOrSummaryOrOpt,
    options?: RouteOpt
  ): ClassAndMethodDecorator => route('POST',
    pathOrRolesOrFunctionOrOptions,
    schemaOrRolesOrSummaryOrFunction,
    rolesOrSchemaOrSummaryOrFunction,
    summaryOrSchemaOrRolesOrFunction,
    options),
  PATCH: (
    pathOrRolesOrFunctionOrOptions?: ArgPathOrRolesOrOpt,
    schemaOrRolesOrSummaryOrFunction?: ArgSchemaOrRolesOrSummaryOrOpt,
    rolesOrSchemaOrSummaryOrFunction?: ArgSchemaOrRolesOrSummaryOrOpt,
    summaryOrSchemaOrRolesOrFunction?: ArgSchemaOrRolesOrSummaryOrOpt,
    options?: RouteOpt
  ): ClassAndMethodDecorator => route('PATCH',
    pathOrRolesOrFunctionOrOptions,
    schemaOrRolesOrSummaryOrFunction,
    rolesOrSchemaOrSummaryOrFunction,
    summaryOrSchemaOrRolesOrFunction,
    options),
  PUT: (
    pathOrRolesOrFunctionOrOptions?: ArgPathOrRolesOrOpt,
    schemaOrRolesOrSummaryOrFunction?: ArgSchemaOrRolesOrSummaryOrOpt,
    rolesOrSchemaOrSummaryOrFunction?: ArgSchemaOrRolesOrSummaryOrOpt,
    summaryOrSchemaOrRolesOrFunction?: ArgSchemaOrRolesOrSummaryOrOpt,
    options?: RouteOpt
  ): ClassAndMethodDecorator => route('PUT',
    pathOrRolesOrFunctionOrOptions,
    schemaOrRolesOrSummaryOrFunction,
    rolesOrSchemaOrSummaryOrFunction,
    summaryOrSchemaOrRolesOrFunction,
    options),
  DELETE: (
    pathOrRolesOrFunctionOrOptions?: ArgPathOrRolesOrOpt,
    schemaOrRolesOrSummaryOrFunction?: ArgSchemaOrRolesOrSummaryOrOpt,
    rolesOrSchemaOrSummaryOrFunction?: ArgSchemaOrRolesOrSummaryOrOpt,
    summaryOrSchemaOrRolesOrFunction?: ArgSchemaOrRolesOrSummaryOrOpt,
    options?: RouteOpt
  ): ClassAndMethodDecorator => route('DELETE',
    pathOrRolesOrFunctionOrOptions,
    schemaOrRolesOrSummaryOrFunction,
    rolesOrSchemaOrSummaryOrFunction,
    summaryOrSchemaOrRolesOrFunction,
    options),

  LIST: (
    schemaOrRolesOrSummaryOrFunction?: ArgSchemaOrRolesOrSummaryOrOpt,
    rolesOrSchemaOrSummaryOrFunction?: ArgSchemaOrRolesOrSummaryOrOpt,
    summaryOrSchemaOrRolesOrFunction?: ArgSchemaOrRolesOrSummaryOrOpt,
    options?: RouteOpt
  ): ClassDecorator => route('LIST',
    undefined,
    schemaOrRolesOrSummaryOrFunction,
    rolesOrSchemaOrSummaryOrFunction,
    summaryOrSchemaOrRolesOrFunction,
    options
  ),

  auth: (
    ...authorizeFunctions: Array<RouteAuth>
  ): ClassDecorator => {
    return function(prototype: any): any {
      const col = getCollectionForContainer(prototype)
      for(const authorizeFunction of authorizeFunctions) {
        col.decorate('Route.auth', {prototype, authorizeFunction})
      }
    }
  },

  /**
   * Add roles based on request session
   */
  roles: (
    ...rolesFunctions: RouteRoles[]
  ): ClassDecorator => {
    return function(prototype: any): any {
      const col = getCollectionForContainer(prototype)
      for(const rolesFunction of rolesFunctions){
        col.decorate('Route.roles', {prototype,rolesFunction})
      }
      return prototype
    }
  },

  /**
   * Set global roles
   */
  groups: (
    rolesOrCreatorsOrFunction: Roles | RolesFunc = [],
    readersOrFunction?: Roles | RolesFunc,
    updatersOrFunction?: Roles | RolesFunc,
    deletersOrFunction?: Roles | RolesFunc
  ): ClassDecorator => {
    return function(prototype: any): any {
      const col = getCollectionForContainer(prototype)

      let creators = argumentResolve(rolesOrCreatorsOrFunction)
      let readers = argumentResolve(readersOrFunction)
      let updaters = argumentResolve(updatersOrFunction)
      let deleters = argumentResolve(deletersOrFunction)

      // call (globalRoles)
      if(!readers && !updaters && !deleters){
        readers = creators
        updaters = creators
        deleters = creators
      }

      col.addRoles('creators', creators)
      col.addRoles('readers', readers)
      col.addRoles('updaters', updaters)
      col.addRoles('deleters', deleters)
      return prototype
    }
  },

  /**
   * Enable some routes
   */
  use: (
    ...methodsAndOptions: Array<RoutePreset | RouteDecorator | RouteOpt>
  ): ClassDecorator => {
    const arr = typeof methodsAndOptions[0] === 'string' && ROUTE_PRESET[methodsAndOptions[0] as RoutePreset]
      ? [...ROUTE_PRESET[methodsAndOptions[0] as RoutePreset], ...methodsAndOptions.slice(1)] : methodsAndOptions

    const opt = arr.find(a => a && typeof a === 'object') as RouteOpt
    const methods = arr.filter(a => typeof a === 'string') as RouteDecorator[]
    return function(prototype: any): any {
      methods.forEach((method: RouteDecorator) => {
        route(method, opt)(prototype)
      })
      return prototype
    }
  },

  /**
   * Enable all routes
   * @deprecated
   */
  all: (
    rolesOrCreatorsOrFunctionOrOptions?: Roles | RolesFunc | RouteOpt,
    readersOrFunctionOrOptions?: Roles | RolesFunc | RouteOpt,
    updatersOrFunctionOrOptions?: Roles | RolesFunc | RouteOpt,
    deletersOrFunctionOrOptions?: Roles | RolesFunc | RouteOpt,
    globalOptions?: RouteOpt
  ): ClassDecorator => {
    return function(prototype: any): any {
      let creators = argumentResolve(rolesOrCreatorsOrFunctionOrOptions)
      let readers = argumentResolve(readersOrFunctionOrOptions)
      let updaters = argumentResolve(updatersOrFunctionOrOptions)
      let deleters = argumentResolve(deletersOrFunctionOrOptions)

      // call (opt)
      if(creators && !Array.isArray(creators)){
        globalOptions = creators
        creators = undefined
      }

      // call (globalRoles, opt?)
      if((!readers || !Array.isArray(readers)) && !updaters && !deleters){
        if(readers) globalOptions = readers
        readers = creators
        updaters = creators
        deleters = creators
      }

      // setup routes
      route('DELETE', deleters, globalOptions)(prototype)
      route('PUT', updaters, globalOptions)(prototype)
      route('PATCH', updaters, globalOptions)(prototype)
      route('POST', creators, globalOptions)(prototype)
      route('GET', readers, globalOptions)(prototype)
      route('LIST', readers, globalOptions)(prototype)

      return prototype
    }
  }
}