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

// https://stackoverflow.com/questions/45306782/typescript-declaration-for-polymorphic-decorator
export interface ClassAndMethodDecorator {
	// Class decorator overload
	<TFunction extends Function>(target: TFunction): TFunction;

	// Property decorator overload
	<T>(target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>): TypedPropertyDescriptor<T>;
}

export interface ClassAndPropertyDecorator {
	// Class decorator overload
	<TFunction extends Function>(target: TFunction): TFunction;

	<T>(target: Object, propertyKey: string | symbol): T
}
// declare type PropertyDecorator = (target: Object, propertyKey: string | symbol) => void;

export type Related<T> = (optOrSet?: T | null | string[]) => T;

export type Abstract<T> = Function & {prototype: T};
export type Constructor<T> = new (...args: any[]) => T;
export type Class<T = {}> = Abstract<T> | Constructor<T>;

// export interface ClassType<T = any> {
// 	new(...args: any[]): T;
// }
//
// export type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;
// export type TypeValue = ClassType | Function | object | symbol;

export type CollectionName = string;

export interface CreateCollectionOptions extends ArangoDB.CreateCollectionOptions {
	name?: CollectionName
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

export interface IndexOptionsWithType extends IndexOptions {
	type: ArangoDB.IndexType
}

export enum LogLevel {
	Error = 1,
	Warn,
	Info,
	Debug
}

export interface Config {
	requiredRolesFallback: Roles
	requiredWriterRolesFallback: Roles
	providedRolesDefault: Roles
	getUserRoles: (req: Foxx.Request) => Roles
	getAuthorizedRoles: (userRoles: Roles, accessRoles: Roles) => Roles
	logLevel: LogLevel
	throwForbidden: ArangoDB.HttpStatus
	throwUnauthorized: ArangoDB.HttpStatus
	dasherizeRoutes: boolean
	defaultLocale: string
	prefixCollectionName: boolean
	exposeRouteFunctionsToSwagger: boolean
	addAttributeWritersToReaders: boolean
	stripDocumentId: boolean
	stripDocumentKey: boolean
	stripDocumentRev: boolean
	forClient: null | DocumentForClient
	fromClient: null | DocumentFromClient
}

export type RouteMethod = 'get' | 'post' | 'patch' | 'put' | 'delete';

// export type MetadataId = 'attribute' | 'index' | 'route';
// export type MetadataTypes = AttributeMetadata | IndexMetadata | RouteMetadata;

export type Roles = string[];
export type RolesFunc = (returns?: void) => Roles;

// export interface Metadata<T> {
// 	id: MetadataId,
// 	attribute: string;
// 	data: T
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

export interface AuthorizedMetadata {
	authorized: AttributeRoles
}

export interface IndexMetadata extends ArangoDB.IndexDescription<string | string[]> {}

export interface RouteMetadata {
	method: RouteMethod
	opt?: RouteOpt
}

export interface AttributeMetadata {
	schema?: Schema
	metadata?: any
	roles?: AttributeRoles
}

export interface SchemaStructure {
	[key: string]: Schema
}

export type DecoratorIds = 'Attribute' | 'Description' | 'Index' | 'Collection' | 'Document' | 'Nested' | 'Route'
	| 'Route.auth' | 'Route.roles' | RelationType;
export type DecoratorStorage = {
	[key in DecoratorIds]?: DecoratorObject[]
}
export interface DecoratorObject {
	decorator: DecoratorIds
	prototype: any
	attribute?: string
	[key: string]: any
}

export type RelationType = 'OneToOne' | 'OneToMany';// | 'ManyToOne' | 'ManyToMany';

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
	& LazySchema;
export type Enjoi = typeof enjoi;
export type ValidateSchema = Schema | JoiContainer;
export type ValidateSchemaFunc = (returns: AnyJoiSchema, enjoi: Enjoi) => AnyJoiSchema;

export interface RouteBaseOpt {
	deprecated?: boolean
	tags?: string[]
	summary?: string
	description?: string
}

export interface RouteOpt extends RouteBaseOpt {
	body?: RouteBody
	pathParams?: RoutePathParam[]
	queryParams?: RouteQueryParam[]
	response?: RouteResponse
	errors?: RouteError[]
	path?: string
	process?: boolean
	handlerName?: string
	handler?: (arg: RouteArg) => any
	roles?: Roles
}

interface TemplateStringsArray extends ReadonlyArray<string> {
	readonly raw: ReadonlyArray<string>
}

export interface RouteRolesArg {
	path: string
	method: RouteMethod
	_key: string
	aql: (strings: TemplateStringsArray, ...args: any[]) => ArangoDB.Query
	query: (query: ArangoDB.Query, options?: ArangoDB.QueryOptions) => ArangoDB.Cursor
	collection: ArangoDB.Collection
	req: Foxx.Request
	res: Foxx.Response
	roles?: Roles
	requestedAttributes: string[]
	session: (set?: Partial<Foxx.Session>) => Foxx.Session
	hasAuth: boolean
	auth: RouteAuthorize
	error: (status: ArangoDB.HttpStatus, reason?: string) => Foxx.Response
}
export type RouteRoles = (arg: RouteRolesArg) => Roles;

export interface RouteArg extends RouteRolesArg, RouteBaseOpt {
	userRoles: string[]
	json: (omitUnwritableAttributes?: boolean) => DocumentData // read role specific body
	send: (data: DocumentData, omitUnreadableAttributes?: boolean) => Foxx.Response // send role specific response
}

// const inp = {session:req.session,method,doc,req,res};
export type TypeFunc = (returns?: void) => Class;

type RouteStatus = number | ArangoDB.HttpStatus;

export type RouteError = [RouteStatus, string];
export type RouteParam = [string, Schema, string?];
export type RouteQueryParam = RouteParam;
export type RoutePathParam = RouteParam;
export type RouteBody = [Schema, string?];
export type RouteHandler = (args: RouteArg) => any;

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
	method: string
	document: DocumentData;
	doc: DocumentData; // alias for document
}

// export type AuthorizeMethod = 'read' | 'insert' | 'update' | 'delete';
export type RouteAuthorize = (doc: DocumentData, method?: RouteMethod) => false | DocumentData;

export type DocumentForClient = (doc: DocumentData, opt: any) => DocumentData;
export type DocumentFromClient = (doc: DocumentData, opt: any) => DocumentData;

export interface RouteData {
	// col: Collection
	doc: any
	router: Foxx.Router
	method: RouteMethod
	name: string
	path: string
	pathParams: RoutePathParam[]
	queryParams: RouteQueryParam[]
	body?: RouteBody
	response: RouteResponse
	errors: RouteError[]
	summary: string
	description: string
	deprecated?: boolean
	tags?: string[]
	routeAuths: Array<RouteAuthorize>
	routeRoles: Array<RouteRoles>
	roles?: Roles
	roleStripAttributes: RoleObject
	handler?: RouteHandler
}


export interface QueryFilter {
	[key: string]: string | string[] | number | number[] | boolean | boolean[]
}

export interface QueryOpt {
	collection?: string
	filter?: QueryFilter
	sort?: string[]
	limit?: number | [number, number]
	keep?: string[]
	unset?: string[]
}