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
} from 'joi';
import {enjoi} from './utils';

// https://stackoverflow.com/questions/45306782/typescript-declaration-for-polymorphic-decorator
export interface ClassAndMethodDecorator {
	// Class decorator overload
	<TFunction extends Function>(target: TFunction): TFunction;

	// Property decorator overload
	<T>(target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>): TypedPropertyDescriptor<T>;
}

export interface ClassType<T = any> {
	new(...args: any[]): T;
}

export type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;

export type TypeValue = ClassType | Function | object | symbol;

export type CollectionName = string;

export interface CreateCollectionOptions extends ArangoDB.CreateCollectionOptions {
	name?: CollectionName;
}

export interface IndexOptions {
	type?: ArangoDB.IndexType;
	additionalFields?: string[];
	sparse?: boolean;
	unique?: boolean;
	deduplicate?: boolean;
}

export interface DocumentData {
	[key: string]: any
}

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
	getUserRoles: (req: Foxx.Request) => Roles;
	getAuthorizedRoles: (userRoles: Roles, accessRoles: Roles) => Roles;
	logLevel: LogLevel
	unauthorizedThrow: ArangoDB.HttpStatus
	pluralizeCollectionName: boolean;
	prefixCollectionName: boolean;
	exposeRouteFunctionsToSwagger: boolean;
	addFieldWritersToFieldReaders: boolean;
	stripDocumentId: boolean;
	stripDocumentKey: boolean;
	stripDocumentRev: boolean;
}

export type IndexTypeFunct = (returns: ArangoDB.IndexType) => ArangoDB.IndexType;

export type RouteMethod = 'get' | 'post' | 'patch' | 'put' | 'delete';

export type MetadataId = 'field' | 'index' | 'authorized' | 'validate' | 'route';
export type MetadataTypes = FieldMetadata | IndexMetadata | AuthorizedMetadata | RouteMetadata;

export type Roles = string[];
export type RolesFunc = (returns?: void) => Roles;

export interface Metadata<T> {
	id: MetadataId,
	field: string;
	data: T
}

export interface CollectionField {
	[key: string]: FieldObject;
}

export interface FieldObject {
	field: string;
	roles?: FieldRoles;
	schema?: Schema;
	metadata: any;
}

export interface FieldRoles {
	readers: Roles;
	writers: Roles;
}

export interface RoleFields {
	read: string[];
	write: string[];
}

export interface RoleObject {
	[key: string]: RoleFields;
}

export interface AuthorizedMetadata {
	authorized: FieldRoles;
}

export interface IndexMetadata extends ArangoDB.IndexDescription<string | string[]> {}

export interface RouteMetadata {
	method: RouteMethod,
	opt?: RouteOpt
}

export interface FieldMetadata {
	schema: Schema;
	metadata: any;
	roles?: FieldRoles;
}

export interface SchemaStructure {
	[key: string]: Schema;
}

export interface JoiContainer {
	schema: Schema,
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
	deprecated?: boolean,
	tags?: string[],
	summary?: string;
	description?: string;
	roles?: Roles;
}

export interface RouteOpt extends RouteBaseOpt {
	body?: RouteBody;
	pathParams?: RoutePathParam[];
	queryParams?: RouteQueryParam[];
	response?: RouteResponse;
	errors?: RouteError[];
	path?: string;
	process?: boolean;
	handlerName?: string;
	handler?: (arg: RouteArgs) => any;
}

export interface RouteArgs extends RouteBaseOpt {
	req: Foxx.Request;
	res: Foxx.Response;
	collection: ArangoDB.Collection;
	userRoles: string[];
	requestedFields: string[];
	send: (doc: any, disableRoleStrip?: boolean) => Foxx.Response; // send role specific response
	json: (disableRoleStrip?: boolean) => any; // read role specific body
	path: string;
	_key: string;
	method: RouteMethod;
}

type RouteStatus = number | ArangoDB.HttpStatus;

export type RouteError = [RouteStatus, string];
export type RouteQueryParam = [string, Schema, string?];
export type RoutePathParam = [string, Schema, string?];
export type RouteBody = [Schema, string?];
export type RouteHandler = (args: RouteArgs) => any;

export interface RouteResponse {
	status: RouteStatus,
	schema: Foxx.Schema | Foxx.Model,
	mime: string[];
	description?: string;
}

export interface RouteData {
	router: Foxx.Router;
	method: RouteMethod;
	name: string;
	path: string;
	pathParams: RoutePathParam[];
	queryParams: RouteQueryParam[];
	body?: RouteBody;
	response: RouteResponse;
	errors: RouteError[];
	summary: string;
	description: string;
	deprecated?: boolean;
	tags?: string[];
	roles?: Roles;
	roleStripFields: RoleObject;
	handler?: RouteHandler;
}