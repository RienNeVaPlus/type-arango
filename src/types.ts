import * as Joi from 'joi'
import {
  AlternativesSchema,
  AnySchema,
  ArraySchema,
  BinarySchema,
  BooleanSchema,
  DateSchema,
  FunctionSchema,
  LazySchema,
  NumberSchema,
  ObjectSchema,
  Schema,
  StringSchema,
  ValidationOptions
} from 'joi'
import {enjoi} from './utils'
import {Entity} from './models'

// https://stackoverflow.com/questions/45306782/typescript-declaration-for-polymorphic-decorator
export interface ClassAndMethodDecorator {
  // Class decorator overload
  <TFunction extends Function>(target: TFunction): TFunction

  // Property decorator overload
  <T>(target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>): TypedPropertyDescriptor<T>
}

export interface ClassAndPropertyDecorator {
  // Class decorator overload
  <TFunction extends Function>(target: TFunction): TFunction

  (target: Object, propertyKey: string | symbol): void
}
// declare type PropertyDecorator = (target: Object, propertyKey: string | symbol) => void

export type Related<T = any> = T | any

export type Abstract<T> = Function & {prototype: T}
export type Constructor<T> = new (...args: any[]) => T
export type Class<T = {}> = Abstract<T> | Constructor<T>

export type CollectionName = string

export interface CreateCollectionOptions extends ArangoDB.CreateCollectionOptions, Partial<RouteGroups> {
  name?: CollectionName
  of?: typeof Entity
  auth?: RouteAuth[] | RouteAuth
  roles?: RouteRoles[] | RouteRoles
  routes?: Array<RouteDecorator | CollectionRoute | CollectionRouteArray>
  relations?: string[] | true
  cache?: number | string
}
export type CollectionRouteArray = [RouteDecorator, string | CollectionRoute | SchemaFn, ...any[]]
export interface CollectionRoute extends RouteOpt {
  method: RouteDecorator
}

export interface IndexOptions {
  type?: ArangoDB.IndexType
  additionalFields?: string[]
  sparse?: boolean
  unique?: boolean
  deduplicate?: boolean
}

export interface DocumentData {
  [key: string]: any
}

export interface DocumentMap {
  forClient?: (doc: DocumentData, opt?: any) => DocumentData
  fromClient?: (doc: DocumentData, opt?: any) => DocumentData
}

export interface DocumentOptions extends DocumentMap {}

export enum LogLevel {
  Error = 1,
  Warn,
  Info,
  Debug
}

export interface Config {
  logLevel: LogLevel
  requiredRolesFallback: Roles
  requiredWriterRolesFallback: Roles
  providedRolesDefault: Roles
  getUserRoles: (req: Foxx.Request) => Roles
  getAuthorizedRoles: (userRoles: Roles, accessRoles: Roles) => Roles
  throwForbidden: ArangoDB.HttpStatus
  throwUnauthorized: ArangoDB.HttpStatus
  unregisterAQLFunctionEntityGroup: boolean
  dasherizeRoutes: boolean
  paramOperatorSeparator: string
  disableCache: boolean
  defaultLocale: string
  defaultCurrency: string
  defaultListLimit: number
  defaultListLimitMax: number
  prefixCollectionName: boolean
  exposeRouteFunctionsToSwagger: boolean
  addAttributeWritersToReaders: boolean
  stripDocumentId: boolean
  stripDocumentKey: boolean
  stripDocumentRev: boolean
  forClient: null | DocumentForClient
  fromClient: null | DocumentFromClient
}

export type RoutePreset = '*' | 'ALL' | 'ALL+' | 'CRUD' | 'CRUD+'
export type RouteDecorator = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' | 'LIST'
export type RouteMethod = 'get' | 'post' | 'patch' | 'put' | 'delete'
export type RouteAction = 'create' | 'read' | 'update' | 'delete' | 'list'

// export type MetadataId = 'attribute' | 'index' | 'route'
// export type MetadataTypes = AttributeMetadata | IndexMetadata | RouteMetadata

export type Roles = string[]
export type RolesFn = (returns?: void) => Roles

// export interface Metadata<T> {
//   id: MetadataId,
//   attribute: string
//   data: T
// }

export interface DocumentAttribute {
  [key: string]: AttributeObject
}

export interface AttributeObject {
  attribute: string
  roles?: AttributeRoles
  schema?: Schema
  metadata?: any
}

export interface AttributeRoles {
  readers: Roles
  writers: Roles
}

export interface RoleAttributes {
  read: string[]
  write: string[]
}

export interface RoleObject {
  [key: string]: RoleAttributes
}

export type SchemaFn = (enjoi: (type?: any) => typeof Joi | any, joi?: any) => typeof Joi | boolean | Object

export interface SchemaStructure {
  [key: string]: Schema
}

export type DecoratorId = 'Attribute' | 'Authorized' | 'Description' | 'Index' | 'Collection' | 'Document' | 'Nested' | 'Route'
  | 'Route.auth' | 'Route.roles' | RelationType | EventDecorator | 'Task' | 'Function'
export type DecoratorStorage = {
  [key in DecoratorId]?: DecoratorObject[]
}
export interface DecoratorObject {
  decorator: DecoratorId
  prototype: any
  attribute?: string
  [key: string]: any
}

export type RelationType = 'OneToOne' | 'OneToMany'// | 'ManyToOne' | 'ManyToMany'

export interface Relation<T=any> {
  type: RelationType
  document: T
  attribute: string
}

export interface RelationStructure<T> {
  [key: string]: Relation<T>
}

export interface JoiContainer {
  schema: Schema
  opt: ValidationOptions
}

// https://github.com/RienNeVaPlus/type-arango/issues/2
export type AnyJoiSchema = AnySchema
  & ArraySchema
  & AlternativesSchema
  & BinarySchema
  & BooleanSchema
  & DateSchema
  & FunctionSchema
  & NumberSchema
  & ObjectSchema
  & StringSchema
  & LazySchema
export type Enjoi = typeof enjoi
export type ValidateSchema = Schema | JoiContainer
export type ValidateSchemaFn = (returns: AnyJoiSchema, enjoi: Enjoi) => AnyJoiSchema

export interface RouteBaseOpt {
  deprecated?: boolean
  tags?: string[]
  summary?: string
  description?: string
}

export interface RouteOpt extends RouteBaseOpt {
  action?: 'list'
  body?: RouteBody
  pathParams?: RoutePathParam[]
  queryParams?: RouteQueryParam[]
  response?: Partial<RouteResponse>
  errors?: RouteError[]
  path?: string
  process?: boolean
  handlerName?: string
  handler?: (arg: RouteArg) => any
  cache?: string | number
  roles?: Roles
  schema?: Schema | SchemaFn
  relations?: string[] | true
}

interface TemplateStringsArray extends ReadonlyArray<string> {
  readonly raw: ReadonlyArray<string>
}

interface Aql {
  (strings: TemplateStringsArray, ...args: any[]): ArangoDB.Query
  literal(value: any): ArangoDB.AqlLiteral
}

type RouteArgFetch = (strings: TemplateStringsArray, ...args: any[]) => any[]

export interface RouteRolesArg {
  // @deprecated
  $: (
    strings: TemplateStringsArray,
    ...args: any[]
  ) => ArangoDB.Cursor
  _: RouteArgFetch
  _key: string
  action: RouteAction
  aql: Aql
  auth: RouteAuthorize
  collection: ArangoDB.Collection
  db: ArangoDB.Database
  document: (selector?: string | ArangoDB.DocumentLike) => DocumentData
  error: (status: ArangoDB.HttpStatus, reason?: string) => Foxx.Response
  exists: (selector: string) => boolean
  fetch: RouteArgFetch
  hasAuth: boolean
  insert: (data: DocumentData, options?: ArangoDB.InsertOptions) => ArangoDB.InsertResult
  method: RouteMethod
  name: string
  param: {[key: string]: any}
  path: string
  query: (query: ArangoDB.Query, options?: ArangoDB.QueryOptions) => ArangoDB.Cursor
  relations: (data: DocumentData) => DocumentData
  remove: (selector: string | ArangoDB.DocumentLike, options?: ArangoDB.RemoveOptions) => ArangoDB.RemoveResult
  replace: (selector: string | ArangoDB.DocumentLike, data: DocumentData, options?: ArangoDB.ReplaceOptions) => ArangoDB.UpdateResult
  req: Foxx.Request
  requestedAttributes: string[]
  res: Foxx.Response
  roles?: Roles
  session: (set?: Partial<Foxx.Session>) => Foxx.Session
  update: (selector: string | ArangoDB.DocumentLike | DocumentData, data?: DocumentData, options?: ArangoDB.UpdateOptions) => ArangoDB.UpdateResult
  validParams: string[]
}
export type RouteRoles = (arg: RouteRolesArg) => Roles
export type RouteAuth = (arg: RouteAuthArg) => boolean
export interface RouteGroups {
  creators: Roles
  readers: Roles
  updaters: Roles
  deleters: Roles
}

export interface RouteArg extends RouteRolesArg, RouteBaseOpt {
  userRoles: string[]
  json: (omitUnwritableAttributes?: boolean) => DocumentData // read role specific body
  send: (data: DocumentData | any, omitUnreadableAttributes?: boolean) => Foxx.Response // send role specific response
}

// const inp = {session:req.session,method,doc,req,res}
export type TypeFn = (returns?: void) => Class

type RouteStatus = number | ArangoDB.HttpStatus

export type RouteError = [RouteStatus, string]
export type RouteParam = [string, Schema, string?]
export type RouteQueryParam = RouteParam
export type RoutePathParam = RouteParam
export type RouteBody = [Schema, string?]
export type RouteHandler = (args: RouteArg) => any

export interface RouteResponse {
  status: RouteStatus
  schema: Foxx.Schema | Foxx.Model
  mime: string[]
  description?: string
}

export interface RouteAuthArg {
  req: Foxx.Request
  res: Foxx.Response
  session: Foxx.Session
  method?: RouteMethod
  action?: RouteAction
  roles: Roles
  document: DocumentData
  doc: DocumentData // alias for document
}

// export type AuthorizeMethod = 'read' | 'insert' | 'update' | 'delete'
export type RouteAuthorize = (doc: DocumentData, method?: RouteMethod, action?: RouteAction) => false | DocumentData

export type DocumentForClient = (doc: DocumentData, opt: any) => DocumentData
export type DocumentFromClient = (doc: DocumentData, opt: any) => DocumentData

type QueryFilterLogicalOperator = '&&' | '||' | 'AND' | 'OR'
type QueryFilterComparisonOperator = '==' | '!=' | '<' | '<=' | '>' | '>=' | 'IN' | 'NOT IN' | 'LIKE' | '=~' | '!~' | 'HAS'
type QueryFilterValue = undefined | string | number | boolean | [QueryFilterComparisonOperator, ...(string | number | boolean)[]]
export interface QueryFilter {
  $?: QueryFilterLogicalOperator
  [key: string]: QueryFilterValue
}

export interface QueryOpt {
  collection?: string
  filter?: QueryFilter | QueryFilter[]
  sort?: string[]
  limit?: number | [number, number]
  keep?: string[]
  unset?: string[]
}

export type EventDecorator =
  'After.document.class' | 'After.document.prop' |
  'Before.document.class' | 'Before.document.prop' |
  'After.insert.class' | 'After.insert.prop' |
  'Before.insert.class' | 'Before.insert.prop' |
  'After.update.class' | 'After.update.prop' |
  'Before.update.class' | 'Before.update.prop' |
  'After.replace.class' | 'After.replace.prop' |
  'Before.replace.class' | 'Before.replace.prop' |
  'After.modify.class' | 'After.modify.prop' |
  'Before.modify.class' | 'Before.modify.prop' |
  'After.write.class' | 'After.write.prop' |
  'Before.write.class' | 'Before.write.prop' |
  'After.remove.class' | 'After.remove.prop' |
  'Before.remove.class' | 'Before.remove.prop'

export type EventType =
  'After.document' | 'Before.document' |
  'After.insert' | 'Before.insert' |
  'After.update' | 'Before.update' |
  'After.modify' | 'Before.modify' |
  'After.write' | 'Before.write' |
  'After.replace' | 'Before.replace' |
  'After.remove' | 'Before.remove'

export type EventMethod = 'document' | 'insert' | 'update' | 'replace' | 'modify' | 'write' | 'remove'