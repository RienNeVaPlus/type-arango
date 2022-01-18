import {isActive} from '../index'
import {getCollectionForContainer} from '../models'
import {argumentResolve} from '../utils'
import {
  ClassAndMethodDecorator,
  Roles,
  RolesFn,
  RouteAuth,
  RouteDecorator,
  RouteOpt, RoutePreset,
  RouteRoles,
  SchemaFn
} from '../types'
import {SymbolKeysNotSupportedError} from '../errors'
import {Schema} from 'joi'

export type PathFn = (returns?: string) => any
export type SummaryFn = (returns?: string) => string

type ArgPathOrRolesOrOpt = string | PathFn | Roles | RolesFn | RouteOpt | SchemaFn
type ArgSchemaOrRolesOrSummaryOrOpt = string | SummaryFn | boolean | Schema | SchemaFn | Roles | RolesFn | RouteOpt

export const ROUTE_PRESET: {[key in RoutePreset]: RouteDecorator[]} = {
  '*': ['GET','POST','PATCH','PUT','DELETE','LIST'],
  'ALL': ['GET','POST','PATCH','PUT','DELETE'],
  'ALL+': ['GET','POST','PATCH','PUT','DELETE','LIST'],
  'CRUD': ['GET','POST','PATCH','DELETE'],
  'CRUD+': ['GET','POST','PUT','DELETE','LIST'],
}

export function route(
  method: RouteDecorator,
  pathOrRolesOrOptions?: ArgPathOrRolesOrOpt,
  schemaOrRolesOrSummary?: ArgSchemaOrRolesOrSummaryOrOpt,
  rolesOrSchemaOrSummary?: ArgSchemaOrRolesOrSummaryOrOpt,
  summaryOrSchemaOrRoles?: ArgSchemaOrRolesOrSummaryOrOpt,
  options?: RouteOpt
): ClassAndMethodDecorator {
  return function(prototype: any, attribute?: string | symbol): any {
    if (!isActive) return
    if(typeof attribute === 'symbol')
      throw new SymbolKeysNotSupportedError()

    getCollectionForContainer(prototype).decorate('Route', {
      prototype, attribute, method, pathOrRolesOrOptions, schemaOrRolesOrSummary,
      rolesOrSchemaOrSummary, summaryOrSchemaOrRoles, options
    })
    return prototype
  }
}

export const Route = {
  GET: (
    pathOrRolesOrOptions?: ArgPathOrRolesOrOpt,
    schemaOrRolesOrSummary?: ArgSchemaOrRolesOrSummaryOrOpt,
    rolesOrSchemaOrSummary?: ArgSchemaOrRolesOrSummaryOrOpt,
    summaryOrSchemaOrRoles?: ArgSchemaOrRolesOrSummaryOrOpt,
    options?: RouteOpt
  ): ClassAndMethodDecorator => route('GET',
    pathOrRolesOrOptions,
    schemaOrRolesOrSummary,
    rolesOrSchemaOrSummary,
    summaryOrSchemaOrRoles,
    options),
  POST: (
    pathOrRolesOrOptions?: ArgPathOrRolesOrOpt,
    schemaOrRolesOrSummary?: ArgSchemaOrRolesOrSummaryOrOpt,
    rolesOrSchemaOrSummary?: ArgSchemaOrRolesOrSummaryOrOpt,
    summaryOrSchemaOrRoles?: ArgSchemaOrRolesOrSummaryOrOpt,
    options?: RouteOpt
  ): ClassAndMethodDecorator => route('POST',
    pathOrRolesOrOptions,
    schemaOrRolesOrSummary,
    rolesOrSchemaOrSummary,
    summaryOrSchemaOrRoles,
    options),
  PATCH: (
    pathOrRolesOrOptions?: ArgPathOrRolesOrOpt,
    schemaOrRolesOrSummary?: ArgSchemaOrRolesOrSummaryOrOpt,
    rolesOrSchemaOrSummary?: ArgSchemaOrRolesOrSummaryOrOpt,
    summaryOrSchemaOrRoles?: ArgSchemaOrRolesOrSummaryOrOpt,
    options?: RouteOpt
  ): ClassAndMethodDecorator => route('PATCH',
    pathOrRolesOrOptions,
    schemaOrRolesOrSummary,
    rolesOrSchemaOrSummary,
    summaryOrSchemaOrRoles,
    options),
  PUT: (
    pathOrRolesOrOptions?: ArgPathOrRolesOrOpt,
    schemaOrRolesOrSummary?: ArgSchemaOrRolesOrSummaryOrOpt,
    rolesOrSchemaOrSummary?: ArgSchemaOrRolesOrSummaryOrOpt,
    summaryOrSchemaOrRoles?: ArgSchemaOrRolesOrSummaryOrOpt,
    options?: RouteOpt
  ): ClassAndMethodDecorator => route('PUT',
    pathOrRolesOrOptions,
    schemaOrRolesOrSummary,
    rolesOrSchemaOrSummary,
    summaryOrSchemaOrRoles,
    options),
  DELETE: (
    pathOrRolesOrOptions?: ArgPathOrRolesOrOpt,
    schemaOrRolesOrSummary?: ArgSchemaOrRolesOrSummaryOrOpt,
    rolesOrSchemaOrSummary?: ArgSchemaOrRolesOrSummaryOrOpt,
    summaryOrSchemaOrRoles?: ArgSchemaOrRolesOrSummaryOrOpt,
    options?: RouteOpt
  ): ClassAndMethodDecorator => route('DELETE',
    pathOrRolesOrOptions,
    schemaOrRolesOrSummary,
    rolesOrSchemaOrSummary,
    summaryOrSchemaOrRoles,
    options),

  LIST: (
    schemaOrRolesOrSummary?: ArgSchemaOrRolesOrSummaryOrOpt,
    rolesOrSchemaOrSummary?: ArgSchemaOrRolesOrSummaryOrOpt,
    summaryOrSchemaOrRoles?: ArgSchemaOrRolesOrSummaryOrOpt,
    options?: RouteOpt
  ): ClassDecorator => route('LIST',
    undefined,
    schemaOrRolesOrSummary,
    rolesOrSchemaOrSummary,
    summaryOrSchemaOrRoles,
    options
  ),

  auth: (
    ...authorizeFns: Array<RouteAuth>
  ): ClassDecorator => {
    return function(prototype: any): any {
      const col = getCollectionForContainer(prototype)
      for(const authorizeFn of authorizeFns) {
        col.decorate('Route.auth', {prototype, authorizeFn})
      }
    }
  },

  /**
   * Add roles based on request session
   */
  roles: (
    ...rolesFns: RouteRoles[]
  ): ClassDecorator => {
    return function(prototype: any): any {
      const col = getCollectionForContainer(prototype)
      for(const rolesFn of rolesFns){
        col.decorate('Route.roles', {prototype,rolesFn})
      }
      return prototype
    }
  },

  /**
   * Set global roles
   */
  groups: (
    rolesOrCreators: Roles | RolesFn = [],
    readers?: Roles | RolesFn,
    updaters?: Roles | RolesFn,
    deleters?: Roles | RolesFn
  ): ClassDecorator => {
    return function(prototype: any): any {
      const col = getCollectionForContainer(prototype)

      let creator = argumentResolve(rolesOrCreators)
      let reader = argumentResolve(readers)
      let updater = argumentResolve(updaters)
      let deleter = argumentResolve(deleters)

      // call (globalRoles)
      if(!reader && !updater && !deleter){
        reader = creator
        updater = creator
        deleter = creator
      }

      col.addRoles('creators', creator)
      col.addRoles('readers', reader)
      col.addRoles('updaters', updater)
      col.addRoles('deleters', deleter)
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
    rolesOrCreatorsOrOptions?: Roles | RolesFn | RouteOpt,
    readersOrOptions?: Roles | RolesFn | RouteOpt,
    updatersOrOptions?: Roles | RolesFn | RouteOpt,
    deletersOrOptions?: Roles | RolesFn | RouteOpt,
    globalOptions?: RouteOpt
  ): ClassDecorator => {
    return function(prototype: any): any {
      let creators = argumentResolve(rolesOrCreatorsOrOptions)
      let readers = argumentResolve(readersOrOptions)
      let updaters = argumentResolve(updatersOrOptions)
      let deleters = argumentResolve(deletersOrOptions)

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