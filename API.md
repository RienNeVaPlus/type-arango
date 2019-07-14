# 📗 API Reference

type-arango provides TypeScript decorators to describe collections, document and routes for ArangoDB Foxx Microservices.

#### 🛫 Getting started

- 📕 [README.md](./README.md#-getting-started) - overview
- 📘 [Examples](./examples) - quick-start

![divider](./assets/divider.small.png)

### 📄 Documents

A document represents a single entry of a collection.

#### `Class`
- [Entity](#-entity) - provides ORM functions to document instances
  - [entity.create](#entitycreate) - creates a document
  - [entity.merge](#entitymergedoc) - merges an object into a document
  - [entity.replace](#entityreplacedoc-options) - replaces a document
  - [entity.remove](#entityremoveoptions) - deletes a document
  - [entity.save](#entitysaveoptions) - saves property changes
  - [entity._saveKeys](#entity_savekeys) - returns a list of modified properties
  - [entity.$relation](#entityrelationkeepattributes) - load related documents

#### `ClassDecrorator`
- [@Document](#document) - initializes a new document
- [@Nested](#nested) - initializes a nested document
#### `PropertyDecorator`
- [@Attribute](#attributeschema-readers-writers) - defines property name and type as document attribute
- [@Authorized](#authorizedreaders-writers) - protects the property with read / write roles
- [@Index](#indextype-options) - creates an index for a property
- [@OneToOne](#onetoonetype-relation) - defines a 1:1 relation
- [@OneToMany](#onetomanytype-relation) - defines a 1:n relation

![divider](./assets/divider.small.png)

### 🗄️ Collections

A collection contains documents and provides routes.

#### `Class` 
- [Entities](#-entities) - provides ORM functions
  - [entities.find](#entitiesfindoptions) - returns document instances of the collection
  - [entities.findOne](#entitiesfindoneoptions) - returns single document instance

#### `ClassDecorator`
- [@Collection](#collectionofdocument-options) - initializes a collection
- [@Route.roles](#routerolesrolefunctions) - creates roles for requests by utilizing the client session
- [@Route.auth](#routeauthauthorizefunctions) - authorizes a request depending on a document 
- [@Route.enable](#routeenablecreators-readers-updaters-deleters) - define global roles for custom routes
- [@Route.all](#routeallcreators-readers-updaters-deleters-options) - initializes [CRUD-like](#crud-like) routes 
#### `ClassAndPropertyDecorator`
  - [@Route.GET](#routegetpath-schema-roles-summary-options)
  - [@Route.POST](#routepostpath-schema-roles-summary-options)
  - [@Route.PUT](#routeputpath-schema-roles-summary-options)
  - [@Route.PATCH](#routepatchpath-schema-roles-summary-options)
  - [@Route.DELETE](#routedeletepath-schema-roles-summary-options)
  
![divider](./assets/divider.small.png)

### 🔌 Types

Types are used to better describe common patterns to store and retrieve data.

- 🌐 [Type.I18n](#-typesi18n) - internationalization support

![divider](./assets/divider.small.png)

### ❤️ Misc
- 📜 [Enjoi](#-en-hanced-joi) `(Enjoi, Joi) => Joi` - Enhanced Joi making use of Types
- [Configuration](#-configuration) - Options for `typeArango()`
- [@Description](#descriptionstring) - Decorator for describing Classes or Properties
- ["CRUD-like"](#crud-like) - explained
  
![divider](./assets/divider.png)

### 📝 Configuration

The configuration can be passed into the typeArango function.

```ts
const complete = typeArango({
    /**
     * Prefix the collection name by applying `module.context.collectionName` to it
     */
    prefixCollectionName: boolean = false;
    
    /**
     * Display the source of your routes in Swagger
     */
    exposeRouteFunctionsToSwagger: boolean = true;
    
    /**
     * Dasherize endpoints (eg `UserProfiles` becomes `user-profiles`)
     */
    dasherizeRoutes: boolean = true;
    
    /**
     * Always add field writer roles to field reader roles
     * By default an `@Authorized(readers => ['user'], writers => ['admin'])`
     * evaluates to `readers = ['users','admin'], writers = ['admin']`
     */
    addAttributeWritersToFieldReaders: boolean = true;
    
    /**
     * Whether to strip the `_id` key from documents
     */
    stripDocumentId: boolean = true;
    
    /**
     * Whether to strip the `_rev` key from documents
     */
    stripDocumentRev: boolean = true;
    
    /**
     * Whether to strip the `_key` key from documents
     */
    stripDocumentKey: boolean = false;
    
    /**
     * Available log levels are `Error`, `Warn`, `Info` & `Debug`
     */
    logLevel: LogLevel = LogLevel.Warn;
    
    /**
     * List of roles that are available for every request
     */
    providedRolesDefault: string[] = ['guest']
    
    /**
     * List of required roles for a route when no other roles are defined
     */
    requiredRolesFallback: string[] = ['user']
    
    /**
     * List of required writer roles for a route when no other roles are defined
     */
    requiredWriterRolesFallback: string[] = ['admin']
    
    /**
     * Returns the roles of the current viewer user
     */
    getUserRoles = function(req: Foxx.Request): string[] {
        return (req.session && req.session.data && req.session.data.roles || []).concat('guest');
    };
    
    /**
     * Returns all authorized roles for a request
     */
    getAuthorizedRoles = function(providedRoles: string[], requiredRoles: string[]): string[] {
        return providedRoles.filter((role: string) => requiredRoles.includes(role));
    }
    
    /**
     * HTTP Status to return when an unauthorized (no auth provided) request occurs
     */
    throwUnauthorized: ArangoDB.HttpStatus = 'unauthorized';
    
    /**
     * HTTP Status to return when an forbidden (invalid auth provided) request occurs
     */
    throwForbidden: ArangoDB.HttpStatus = 'unauthorized';
    
    /**
     * Applied on client data when using `json()` inside a route
     */
    fromClient?: (doc: DocumentData, opt: RequestInfo) => DocumentData;
    
    /**
     * Applied on response data when using `send()` inside a route
     */
    forClient?: (doc: DocumentData, opt: RequestInfo) => DocumentData;
});

// initialize documents and collection after calling typeArango
import * as _Collections from './collections';

// completing the setup
complete();
```
![divider](./assets/divider.png)

### 📄 Entity

The Entity class is primarily used to provide ORM functions to document instances. Under the hood it uses a [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) to keep track of property changes and provide schema validation.

#### Example

Extend all documents from the `Entity` class provided by type-arango:
```ts
import { Document, Entity } from 'type-arango'
@Document()
class User extends Entity { ... }
```

When using the entity inside a route, it comes with handy ORM features:
```ts
static route(){
    // create a user instance
    const user = new User({email:'contact@example.com'});
    // save the user to the collection
    user.create();
    
    // change the user and return a list of modified properties
    user.name = 'RienNeVaPlus';
    console.log(user._saveKeys); // => ['name']
    
    // save the changes
    user.save();
}
```
![divider](./assets/divider.small.png)

### `entity.create()`

Stores the instance to the collection. Throws when the document already exists. It's really just an alias for `entity.save({update:false})`.

```ts
// create entity
const user = new User({email:'hello@example.com'});
// store in collection
user.create();
```
![divider](./assets/divider.small.png)

### `entity.merge(doc)`

Merges `doc` into the entity, it's as simple as `Object.assign(this, doc);`.

```ts
// load an user instance
const user = Users.findOne('123');
// merge request body into entity
user.merge(json());
```
![divider](./assets/divider.small.png)

### `entity.replace(doc, options?)`

Replaces the document with the provided object, ignoring `_saveKeys`.

- **doc** `{[key: string]: any}` - object to replace the current document
- **options**? `ArangoDB.ReplaceOptions` - see [ArangoDB manual](https://www.arangodb.com/docs/stable/data-modeling-documents-document-methods.html#replace)

```ts
// load an user instance
const user = Users.findOne('123');
user.name = 'This will be ignored';
// replace the user using Foxx collection._replace
user.replace({email:'test@example.com'}, {overwrite:true});
```
![divider](./assets/divider.small.png)

### `entity.remove(options?)`

Removes the document from the collection using `collection._remove`

- **options**? `ArangoDB.RemoveOptions` - see [ArangoDB manual](https://www.arangodb.com/docs/stable/data-modeling-documents-document-methods.html#remove)
  - **waitForSync**? `boolean`
  - **overwrite**? `boolean`
  - **returnOld**? `boolean`
  - **silent**? `boolean`

```ts
// load an user instance
const user = Users.findOne('123');
// deletes the document from the collection
user.remove();
```
![divider](./assets/divider.small.png)


### `entity.save(options?)`

Saves the values of all changed attributes (`entity._saveKeys`) to the documents collection. Creates a new document when no `_key` is provided. Use the option `{update:false}` to always create a new document even when a `_key` is available.
	 
- **options**? `EntitySaveOptions` - see [ArangoDB manual for insert / save](https://www.arangodb.com/docs/stable/data-modeling-documents-document-methods.html#insert--save).
  - **keepNull**? `boolean`
  - **mergeObjects**? `boolean`
  - **waitForSync**? `boolean`
  - **silent**? `boolean`
  - **returnNew**? `boolean`

```ts
// load an user instance
const user = Users.findOne('123');
// deletes the document from the collection
user.remove();
```
![divider](./assets/divider.small.png)

### `entity._saveKeys`

Returns a list of unsaved / modified properties. Is used by `entity.save` in order to determine which attributes need to be written.

```ts
// load an user instance
const user = Users.findOne('123');
// modify the user
user.name = 'RienNeVaPlus';
// return a list of modified properties
console.log(user._saveKeys); // => ['name']
// save changes
user.save();
// _saveKeys is now empty
console.log(user._saveKeys); // => []
```
![divider](./assets/divider.small.png)

### `entity.$relation(keepAttributes?)`

Properties decorated with [`@OneToOne`](#onetoonetype-relation) or [`@OneToMany`](#onetomanytype-relation) can return related document/s.

- **keepAttributes**? `string[]` - List of attributes to load from the collection, default is all attributes.

Some relations have values, but these are mainly used for fetching the related document. Type-arango overwrites these values with the fetcher function described here. However the original value is available by simply prefixing the property key with an underscore (eg `entity._profile`).

```ts
// in a route
const user = Users.findOne('123');
// returns an address entity instance
const address = user.primaryAddress();
// returns a profile entity instance limited to the selected attributes
const profile = user.profile(['attributes','to','select']);
// read the profile id when stored inside user.profile
const profileId = user._profile;
```

![divider](./assets/divider.png)

### `@Document()`

Decorates a class that has been extended by `Entity`. Documents are consumed by `@Collection`*s* and define a schema which is derived from the property types and additional decorator information.

```ts
@Document()
class User extends Entity { ... }
```
![divider](./assets/divider.small.png)

### `@Nested()`

Documents in ArangoDB can be nested. Make sure to define nested classes before the documents.

```ts
@Nested()
class UserPerson {
    @Attribute()
    gender: string;
}

@Document()
class User extends Entity {
    @Attribute()
    person: UserPerson;
}
```

![divider](./assets/divider.png)

### `@Attribute(schema?, readers?, writers?)`

Defines an attribute of the document. Uses [metadata reflection](https://github.com/rbuckton/reflect-metadata) to derive a Joi schema for the attribute by using the TypeScript type. Schemas will be validated when using routes or modifying entity instances.

- **schema**? `(enjoi: Enjoi, joi: Joi) => Joi` - a function where the first argument is a `Joi` type of the property metadata type (`Joi.string()` in the example below).
- **readers**? `string[]` - Roles with read permission to the attribute
- **writers**? `string[]` - Roles with write permission to the attribute

For more details on roles, see `@Authorized()`.
 
```ts
@Document()
class User extends Entity {
    // attribute has to be an email address
    @Attribute(string => string.email())
    email: string;
    
    // attribute has to be a positive integer with a max of 100
    @Attribute(number => number.integer().positive().max(100))
    age: number;
}
```
![divider](./assets/divider.small.png)

### `@Authorized(readers?, writers?)`

Defines `reader` and `writer` roles to protect attributes in routes. The the [2nd example](examples/2-roles) for details on role authorization.

- **readers**? `string[]` - Roles with read permission to the attribute
- **writers**? `string[]` - Roles with write permission to the attribute
 
```ts
...
@Attribute()
@Authorized(readers => ['user'], writers => ['admin'])
name: string;

// roles can also be defined by only using attribute
@Attribute(readers => ['viewer'], writers => ['viewer','admin'])
age: number;

// even when the attribute has a type
@Attribute(string => string.email(), readers => ['viewer'], writers => ['viewer'])
email: string;
...
```
![divider](./assets/divider.small.png)

### `@Index(type?, options?)`

Creates an index on the attribute.

- **type**? `ArangoDB.IndexType` - Roles with read permission to the attribute
- **options**? ``
  - **type**? `"hash" | "skiplist" | "fulltext" | "geo"`
  - **additionalFields**? `string[]`
  - **sparse?** `boolean`
  - **unique?** `boolean`
  - **deduplicate**? `boolean`
 
> **Warning**: Creating an index on an existing collections can take a some time.

```ts
...
@Index(type => 'hash')
@Attribute()
name: string;

@Index('skiplist', {additionalFields:['height'],sparse:true})
@Attribute()
age: number;
...
```
![divider](./assets/divider.small.png)

### `@OneToOne(type, relation?)`

Defines a 1:1 relation to another entity. Decorated properties have additional functions to fetch related entities, see `entity.relation`. See also [`entity.$relation()`](#entityrelationkeepattributes).

- **type**? `Entity` - The related document entity
- **relation**? `(TypeEntity) => TypeEntity.attribute` - TypeEntity is an object with the same keys as the related entity and can be used to create a relation to a certain field. The default relation is `Entity._key`.

```ts
@Document()
class User {
    @OneToOne(type => Profile)
    profile: Related<Profile>;
    
    @OneToOne(type => Address, Address => Address.owner)
    primaryAddress: Related<Address>;
}
```
![divider](./assets/divider.small.png)

### @OneToMany(type, relation?)

Defines a 1:n relation to another entity. Mostly the same as `@OneToOne` except requesting the relation returns an array of entity instances instead of a single instance. See also [`entity.$relation()`](#entityrelationkeepattributes).

- **type**? `Entity` - The related document entity
- **relation**? `(TypeEntity) => TypeEntity.attribute` - See `@OneToOne`

```ts
@Document()
class User {
    @OneToMany(type => Address, Address => Address.owner)
    addresses: Related<Address[]>;
}
```


![divider](./assets/divider.png)

### 🗄 Entities

The Entities class is primarily used to provide the functions `find` and `findOne` to collection instances.

Extend all collection from the `Entities` class provided by type-arango:
```ts
import { Collection, Entities } from 'type-arango'

@Collection()
class User extends Entities { ... }
```

When using the collection inside a route, it comes with handy ORM features:
```ts
static route(){
    // returns a single User instance
    const user: User = Users.findOne('myDocumentKey');
    // returns a list of matching User instances
    const users: User[] = Users.find({filter:{name:'RienNeVaPlus'},limit:10});
}
```
![divider](./assets/divider.small.png)

### `entities.find(options)`

Returns a list of entity instances.

- **options** `FilterOptions`
  - **filter**? `QueryFilter` - an object of values to filter the collection
    - **value**? `value | [operator, value]` - a filter value can be an array with an operator like `!=` or `>` etc. 
  - **sort**? `string[]` - sorts the results AQL style, eg. `['email DESC','name ASC']`
  - **limit?** `number | [offset, count]` - limits the results AQL style eg. `[10, 2]`
  - **keep?** `string[]` - list attributes to load from collection
  - **unset?** `string[]` - instead of selecting attributes with `keep`, `unset` loads every other attribute, except the provided ones.
  
```ts
static route(){
    // returns a single User instance
    const user: User[] = Users.find({filter:{email:['LIKE', '%@gmail.com']});
}
```
![divider](./assets/divider.small.png)

### `entities.findOne(options)`

The same as `entities.find` except it returns a single instance instead of an array and `options` can be a string alias for `{filter:{_key:options}`.

- **options** `FilterOptions | _key` - see [`entities.find`](#entitiesfindoptions)

```ts
static route(){
    // returns a single User instance
    const user: User = Users.findOne('123');
}
```

![divider](./assets/divider.png)

### `@Collection(ofDocument, options?)`

Decorates a class that has been extended by `Entities`. Collections consume `@Document`*s* and provide routes.

- **ofDocument** `Entity | () => Entity` - the entity of the documents in the collection
- **option**? `ArangoDB.CreateCollectionOptions` - also see [ArangoDB Manual](https://www.arangodb.com/docs/3.4/data-modeling-collections-database-methods.html#create)
  - **name**? `string` - the collection name, by default the class name is used
  - **waitForSync**? `boolean`
  - **journalSize**? `number`
  - **isVolatile**? `boolean`
  - **isSystem**? `boolean`
  - **keyOptions**? `KeyOptions`
    - **type**? `"traditional" | "autoincrement"`
    - **allowUserKeys**? `boolean`
    - **increment**? `number`
    - **offset**? `number`
  - **numberOfShards**? `number`
  - **shardKeys**? `string[]`
  - **replicationFactor**? `number`

```ts
@Collection(of => User)
class Users extends Entities { ... }
```
![divider](./assets/divider.small.png)

### `@Route.roles(...roleFunctions)`

Takes a function to append additional roles for all requests to any route of the collection. It's mainly for generating user specific roles from the client `session`, eg adding a `viewer` role fow own documents.

- **roleFunction** `(arg: RouteRolesArg) => string[]` - a function returning additional roles to grant. The `RouteRolesArg` contain useful tools and information:
  - **req** `Foxx.Request`
  - **res** `Foxx.Response` 
  - **session** `(set?: Partial<Foxx.Session>) => Foxx.Session` - function to read or write the current session
  - **_key**? `string` - the document key of the current request when available
  - **path** `string` - the current path
  - **method** `"GET" | "POST" | "PUT" | "PATCH" | "DELETE"`
  - **aql** `ArangoDB.aql` - the ArangoDB AQL function used for queries
  - **query** `(query: ArangoDB.Query, options?: ArangoDB.QueryOptions) => ArangoDB.Cursor`
  - **collection** `ArangoDB.Collection` - the ArangoDB collection object
  - **roles**? `string[]`
  - **requestedAttributes** `string[]`
  - **hasAuth** `boolean`
  - **auth**? `RouteAuthorize`
  - **error** `(status: ArangoDB.HttpStatus, reason?: string) => Foxx.Response` - send an error response

```ts
@Collection(of => User)
// adds 'viewer' to userRoles when requesting a document where `_key` equals `uid` of the session
@Route.roles(({session, _key}) => session().uid === _key ? ['viewer'] : [])
class Users extends Entities { ... }
```
![divider](./assets/divider.small.png)

### `@Route.auth(...authorizeFunctions)`

Takes a function to determine access permission on a document level. Used whenever there is no other way of determine the permission than deriving them from the document itself. Might cause an additional read, so it is preferred to use [`Route.roles`](#routerolesrolefunctions) whenever possible.

- **authorizeFunction** `(arg: RouteAuthArg) => boolean` - a function returining whether the document can be accessed. The `RouteAuthArg` contain useful tools and information:
  - **req** `Foxx.Request`
  - **res** `Foxx.Response` 
  - **session** `(set?: Partial<Foxx.Session>) => Foxx.Session` - function to read or write the current session
  - **method** `"GET" | "POST" | "PUT" | "PATCH" | "DELETE"`
  - **document** `DocumentData` - the requested document
  - **doc** `DocumentData` - alias for `document`
- **method** - 

```ts
@Collection(of => User)
// allows access to documents with an user attribute qual to session.uid
@Route.auth(({doc, session}) => doc.user === session.uid)
class Users extends Entities { ... }
```
![divider](./assets/divider.small.png)

### `@Route.enable(creators, readers, updaters, deleters)`

Sets the roles for all [CRUD-like](./API.md#crud-like) routes.

- **creators** `() => string[] | string[]` - required roles for `POST` requests
- **readers** `() => string[] | string[]` - required roles for `GET` requests
- **updaters** `() => string[] | string[]` - required roles for `PUT` and `PATCH` requests
- **deleters** `() => string[] | string[]` - required roles for `DELETE` requests

```ts
@Collection(of => User)
// setup global roles for all requests below
@Route.enable(
    creators => ['guest'],
    readers => ['user'],
    updaters => ['user'],
    deleters => ['admin']
)
@Route.POST()
@Route.GET()
class Users extends Entities { ... }
```
![divider](./assets/divider.small.png)

### `@Route.all(creators, readers, updaters, deleters, options?)`

Shortcut for creating all routes at once. Creates `POST`, `GET`, `PUT`, `PATCH` and `DELETE` routes for the collection.

- **creators** `() => string[] | string[]` - required roles for `POST` requests
- **readers** `() => string[] | string[]` - required roles for `GET` requests
- **updaters** `() => string[] | string[]` - required roles for `PUT` and `PATCH` requests
- **deleters** `() => string[] | string[]` - required roles for `DELETE` requests
- **options**? `Partial<RouteArg>` - see [RouteArg](#routearg)

```ts
@Collection(of => Company)
@Route.all(
    creators => ['guest'],
    readers => ['user'],
    updaters => ['user'],
    deleters => ['admin']
)
class Companies extends Entities { ... }
```
![divider](./assets/divider.png)

### Route- GET, POST, PUT, PATCH & DELETE

The `ClassAndProperyDecorators` can be applied on either a static method or a class. When a class is decorated the route will behave as expected from the route method.

For additional details on these routes checkout the Swagger Docs at the `API` tab inside of the ArangoDB Web Interface.

![divider](./assets/divider.small.png)

### RouteArg

All routes receive a single argument, the `RouteArg` which contains useful information and tools to describe, authenticate, read and answer requests. Most of them are well known from the Foxx routes.

- **options**? `RouteOpt`
  - **body**? `RouteBody`
  - **pathParams**? `[string, Schema, string?][]`
  - **queryParams**? `[string, Schema, string?][]`
  - **response**? `RouteResponse`
    - **status** `RouteStatus`
	- **schema** `Foxx.Schema | Foxx.Model`
	- **mime** `string[]`
	- **description**? `string`
  - **errors**? `[RouteStatus, string][]`
  - **path**? `string`
  - **process**? `boolean`
  - **handlerName**? `string`
  - **handler**? `(arg: RouteArg) => any` - The handler of the current request
  - **roles**? `string[]` - List of required roles for accessing the current request
  - **userRoles** `string[]` - List of provided roles for the current request
  - **json** `(omitUnwritableAttributes?: boolean) => DocumentData` - Returns the request body with respect to the document attribute roles (stripping unauthorized attributes, but leaving unknown attributes in place).
  - **send** `(data: DocumentData, omitUnreadableAttributes?: boolean) => Foxx.Response` - send a response - is internally called with any truthful return from a route. Return `void` or `false` to avoid this.
  
![divider](./assets/divider.small.png)

### `@Route.GET(path?, schema?, roles?, summary?, options?)`

When used as a `ClassDecorator` it will create a default route for returning documents of the collection by key.
When used on a static method of the collection a custom request will be created.

- **path**? `string` - a rich path string (can contain simple types, eg. `/:var=number`)
- **schema**? `(enjoi: Enjoi) => Joi` - a Joi schema for accessing the request
- **roles**? `string[]` - roles required to access the route
- **summary**? `string | RouteOpt` - shortcut for `options.summary`
- **options**? `RouteOpt` - see [RouteArg](#routearg)

> The order of the arguments does not matter as long as the options are the last argument.

```ts
@Collection(of => User)
// executed as a ClassDecorator - creates a route on `GET users/:_key` to return a User
@Route.GET(roles => ['admin'])
class Users extends Entities { 
    // executed as a ProperyDecorator - creates a route on `GET users/hello-world?password`
    @Route.GET(
        path => 'hello/world?password',
        roles => ['user'],
        $ => ({
            password: $(String).min(6)
        })
    )
    static GET({ json, error, collection }: RouteArg){
        const { password } = json();
        if(password !== 'top-secret')
            return error('forbidden');
        
        return collection._document('123');
    } 
}
```
![divider](./assets/divider.small.png)

### `@Route.POST(path?, schema?, roles?, summary?, options?)`

Creates a `POST` request with a custom route or - when called as a `ClassDecorator` a route to create new documents inside the collection.

- **path**? `string` - a rich path string (can contain simple types, eg. `/:var=number`)
- **schema**? `(enjoi: Enjoi) => Joi` - a Joi schema for accessing the request
- **roles**? `string[]` - roles required to access the route
- **summary**? `string | RouteOpt` - shortcut for `options.summary`
- **options**? `RouteOpt` - see [RouteArg](#routearg)

> The order of the arguments does not matter as long as the options are the last argument.

```ts
@Collection(of => User)
// executed as a ClassDecorator - creates a route on `POST users/:_key` to create Users
@Route.POST(roles => ['guest'])
class Users extends Entities { 
    // executed as a ProperyDecorator - creates a route on `POST users/hello-world?password`
    @Route.POST('hello-world')
    static POST({ aql, query }: RouteArg){
        return query(aql`
            FOR u IN Users
                FILTER u._key == '123'
                RETURN u
        `).toArray():
    } 
}
```
![divider](./assets/divider.small.png)

### `@Route.PATCH(path?, schema?, roles?, summary?, options?)`

Creates a `PATCH` request with a custom route or - when called as a `ClassDecorator` a route to update documents inside the collection by using `collection._update`.

- **path**? `string` - a rich path string (can contain simple types, eg. `/:var=number`)
- **schema**? `(enjoi: Enjoi) => Joi` - a Joi schema for accessing the request
- **roles**? `string[]` - roles required to access the route
- **summary**? `string | RouteOpt` - shortcut for `options.summary`
- **options**? `RouteOpt` - see [RouteArg](#routearg)

> The order of the arguments does not matter as long as the options are the last argument.

```ts
@Collection(of => User)
// executed as a ClassDecorator - creates a route on `PATCH users/:_key` to update Users
@Route.PATCH(roles => ['guest'])
class Users extends Entities { 
    // executed as a ProperyDecorator - creates a route on `PATCH users/foo`
    @Route.PATCH('foo', ['admin'])
    static PATCH({ res }: RouteArg){
        res.send('foo');
    } 
}
```
![divider](./assets/divider.small.png)

### `@Route.PUT(path?, schema?, roles?, summary?, options?)`

The same as [`Route.PATCH`](#routepatchpath-schema-roles-summary-options) but instead of using `collection._update` it uses `collection._replace`.

```ts
@Collection(of => User)
// executed as a ClassDecorator - creates a route on `PUT users/:_key` to replace Users
@Route.PUT(roles => ['guest'])
class Users extends Entities { 
    // executed as a ProperyDecorator - creates a route on `PUT users/bar`
    @Route.PUT('bar', ['admin'])
    static PUT({ res }: RouteArg){
        res.send('bar');
    } 
}
```
![divider](./assets/divider.small.png)

### `@Route.DELETE(path?, schema?, roles?, summary?, options?)`

Creates a `DELETE` request with a custom route or - when called as a `ClassDecorator` a route to remove a document of the collection by using `collection._remove`.

- **path**? `string` - a rich path string (can contain simple types, eg. `/:var=number`)
- **schema**? `(enjoi: Enjoi) => Joi` - a Joi schema for accessing the request
- **roles**? `string[]` - roles required to access the route
- **summary**? `string | RouteOpt` - shortcut for `options.summary`
- **options**? `RouteOpt` - see [RouteArg](#routearg)

```ts
@Collection(of => User)
// executed as a ClassDecorator - creates a route on `DELETE users/:_key` tp create Users
@Route.DELETE(roles => ['guest'])
class Users extends Entities { 
    // executed as a ProperyDecorator - creates a route on `DELETE users/baz`
    @Route.DELETE('baz', ['admin'])
    static DELETE({ res }: RouteArg){
        res.send('baz');
    } 
}
```

![divider](./assets/divider.png)

### 🌐 Types.I18n

Provides simple internationalization support by storing strings in multiple languages as nested objects. If this type is returned in a request with a `locale` parameter or `session().data.locale` provided, only the respective value will be returned - or if none provided the english (`en`) value.

Set the query parameter `locale` to `*` in order to return all values from a route.

> Don't hesitate to use country specific languages like `de-CH`. When a provided locale has no direct match, the country code is ignored and the global locale value (`de`) will be returned.

```ts
@Document()
@Route.GET()
class Page extends Entity {
    @Attribute()
    title: Type.I18n;
}

// document in collection
{ "title": { "en": "Hello World", "de": "Hallo Welt", "de-CH": "Grüezi Welt" } }

// request examples
// GET page/123?locale=de-AT                        => {title:'Hallo Welt'} 
// GET page/123 && session:{data:{locale:'de-CH'}}  => {title:'Grüezi Welt'} 
// GET page/123                                     => {title:'Hello World'} 
// GET page/123?locale=*                            => original value
```

![divider](./assets/divider.png)

### 📜 En-*(hanced)* Joi

Joi originates from plain JavaScript, but now that we have access to Types, it can be enhanced. Therefore type-arango comes with `Enjoi` which is a simple wrapper around `Joi`. Enjoi is especially useful when using the [@Attribute](#attributeschema-readers-writers) Decorator and it's always involved when there is a mention of `$ => ...` in an example.

```ts
const string = $(String)            // = Joi.string();
const obj = $({
    bool: Boolean                   // = Joi.boolean()
    number: $(Number).integer(),    // = Joi.number().integer()
    valid: ['valid','strings'],     // = Joi.any().valid('valid','strings')
    attribute: $(User).email        // = Joi.string().email() (from User entity)
});                                 // = Joi.object().keys(...)
```

![divider](./assets/divider.png)

### `@Description(string)`

Does not really do anything as of now. Can be decorate a `Class` or a `Propery` and might be to used to further describe routes / entities in the future.

```ts
@Document()
@Description('Every user has a single profile document with a relation on User.profile')
class UserProfile extends Entitiy {
    @Attribute()
    @Description('This attribute can be a useless')
    useless: boolean
    
}
```

![divider](./assets/divider.png)

### *"CRUD like"*

The decorator [`@Route.all`](#routeallcreators-readers-updaters-deleters-options) expects [CRUD](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete) roles but provides five instead of the expected four routes, this is intended because the `updateRoles` can either `PATCH` (update) or `PUT` (replace) an entity.


| Method | [CRUD](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete) | Roles |
| ------ | --------- | -------- |
| GET    | Read      | readers  |
| POST   | Create    | creators |
| PATCH  | Update    | updaters |
| PUT    | Update    | updaters |
| DELETE | Delete    | deleters |

![divider](./assets/divider.small.png)

> Note: Fields have only two access roles: `readers` and `writers`.
