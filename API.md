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
  - [entity.insert](#entityinsert) - creates a document
  - [entity.merge](#entitymergedoc) - merges an object into a document
  - [entity.replace](#entityreplacedoc-options) - replaces a document
  - [entity.remove](#entityremoveoptions) - deletes a document
  - [entity.save](#entitysaveoptions) - saves property changes
  - [entity._saveKeys](#entity_savekeys) - returns a list of modified properties
  - [entity.related](#entityrelatedattribute-keepattributes) - returns related document/s

#### `ClassDecrorator`
- [@Document](#document) - initializes a new document
- [@Edge](#edge) - initializes a new document of an edge collection
- [@Nested](#nested) - initializes a nested document
- [@FromClient](#fromclientmapper) - parse request body before writing to database
- [@ForClient](#forclientmapper) - parse document before sending to client

#### `PropertyDecorator`
- [@Attribute](#attributeschema-readers-writers) - defines property name and type as document attribute
- [@Authorized](#authorizedreaders-writers) - protects the property with read / write roles
- [@Index](#indexadditionalfieldsortype-options) - creates an index for a property
- [@OneToOne](#onetoonetype-relation) - defines a 1:1 relation
- [@OneToMany](#onetomanytype-relation) - defines a 1:n relation

#### `ClassAndPropertyDecorator`
- [Listener](#-listener)
  - [@Before.*](#beforeresolver) - Executes a resolver before requesting data from the database
  - [@After.*](#afterresolver) - Executes a resolver after requesting data from the database

![divider](./assets/divider.small.png)

### 🗄️ Collections

A collection contains documents and provides routes and other utilities.

#### `Class` 
- [Entities](#-entities) - provides ORM functions
  - [entities.find](#entitiesfindoptions) - returns document instances of the collection
  - [entities.findOne](#entitiesfindoneoptions) - returns single document instance

#### `ClassDecorator`
- [@Collection](#collectionofdocument-options) - initializes a collection
- [@Route.use](#routeusemethods-options) - initializes routes by method
- [@Route.groups](#routegroupscreators-readers-updaters-deleters) - defines roles for CRUD routes
- [@Route.roles](#routerolesrolefunctions) - creates roles for requests by utilizing the client session
- [@Route.auth](#routeauthauthorizefunctions) - authorizes a request depending on a document 
- [@Route.LIST]() - initializes a special route for fetching a list

#### `ClassAndMethodDecorator`
  - [@Route.GET](#routegetpath-schema-roles-summary-options)
  - [@Route.POST](#routepostpath-schema-roles-summary-options)
  - [@Route.PUT](#routeputpath-schema-roles-summary-options)
  - [@Route.PATCH](#routepatchpath-schema-roles-summary-options)
  - [@Route.DELETE](#routedeletepath-schema-roles-summary-options)
  
#### `MethodDecorator`
- [@AQLFunction](#aqlfunctionisdeterministic-customname) - register an AQL function
- [@Task](#taskperiod-name-params) - periodically execute a function

![divider](./assets/divider.small.png)

### 🔌 Types

Types are used to better describe common patterns to store and retrieve attribute data.

- 🌐 [Type.I18n](#-typei18n) - Internationalization support
- 💱 [Type.Currencies](#-typecurrencies) - Support for multiple currencies
- 🕒 [Type.DateInsert](#-typedateinsert) - Set attribute to `new Date` when creating documents
- 🕘 [Type.DateUpdate](#-typedateupdate) - Set attribute to `new Date` when updating documents

![divider](./assets/divider.small.png)

### ❤️ Misc
- [Configuration](#-configuration) - Options for `typeArango()`
- [@Description](#descriptionstring) - Decorator for describing Classes or Properties
- 📜 [Enjoi](#-en-hanced-joi) `(Enjoi, Joi) => Joi` - Enhanced Joi making use of Types
- [Client operators](#client-operators-inside-query-parameters) - Clients can provide operators inside query parameter values
- ["CRUD-like"](#crud-like) - explained
  
![divider](./assets/divider.png)

### 📝 Configuration

The configuration can be passed into the typeArango function.

```ts
const complete = typeArango({
    /**
     * Available log levels are `Error`, `Warn`, `Info` & `Debug`
     */
    logLevel: LogLevel = LogLevel.Warn;
    
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
     * Separator used to split a parameter value (ie /?x=LIKE|y)
     */
    paramOperatorSeparator: string = '|'
    
    /**
     * Always add field writer roles to field reader roles
     * By default an `@Authorized(readers => ['user'], writers => ['admin'])`
     * evaluates to `readers = ['users','admin'], writers = ['admin']`
     */
    addAttributeWritersToFieldReaders: boolean = true;
    
    /**
     * When using Type.I18n the defaultLocale is used when other locales do not match
     */
    defaultLocale: string = 'en';
    
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
     * Whether to execute aqlfunctions.unregisterGroup for every collection
     * Set to false when using custom AQL functions outside of type-arango
     */
    unregisterAQLFunctionEntityGroup: boolean = true;
    
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
    user.insert();
    
    // change the user and return a list of modified properties
    user.name = 'RienNeVaPlus';
    console.log(user._saveKeys); // => ['name']
    
    // save the changes
    user.save();
}
```
![divider](./assets/divider.small.png)

### `entity.insert()`

Stores the instance to the collection. Throws when the document already exists. It's really just an alias for `entity.save({update:false})`.

**Example** (in route)
```ts
// create entity
const user = new User({email:'hello@example.com'});
// store in collection
user.insert();
```
![divider](./assets/divider.small.png)

### `entity.merge(doc)`

Merges `doc` into the entity, it's as simple as `Object.assign(this, doc);`.

**Example** (in route)
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

**Example** (in route)
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

**Example** (in route)
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

**Example** (in route)
```ts
// load an user instance
const user = Users.findOne('123');
// deletes the document from the collection
user.remove();
```
![divider](./assets/divider.small.png)

### `entity._saveKeys`

Returns a list of unsaved / modified properties. Is used by `entity.save` in order to determine which attributes need to be written.

**Example** (in route)
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

### `entity.related(attribute, keepAttributes?)`

Returns the related document/s of attributes decorated with [`@OneToOne`](#onetoonetype-relation) or [`@OneToMany`](#onetomanytype-relation).

- **attribute** `string` - attribute to load the related document from
- **keepAttributes**? `string[]` - List of attributes to load from the collection, default is all attributes.

Some relations have values, but these are mainly used for fetching the related document. Type-arango overwrites these values with the fetcher function described here. However the original value is available by simply prefixing the property key with an underscore (eg `entity._profile`).

📘 [Read more on relations](examples/3-relations)

**Example** (in route)
```ts
// in a route
const user = Users.findOne('1');
// returns an address entity instance
const address = user.related('address');
// returns a profile entity instance limited to the selected attributes
const profile = user.related('profile', ['attributes','to','select']);
// read the profile id when stored inside user.profile
const profileId = user.profile;
```

![divider](./assets/divider.png)

### `@Document()`

Decorates a class that has been extended by `Entity`. Documents are consumed by `@Collection(of => Document)` and define a schema which is derived from the property types and additional decorator information.

**Example**
```ts
@Document()
class User extends Entity { ... }
```
![divider](./assets/divider.small.png)

### `@Edge()`

Decorates a class that has been extended by `Entity`. Edges are consumed by `@Collection(of => Edge)` and define a schema which is derived from the property types and additional decorator information.

**Example**
```ts
@Edge()
class Relation extends Entity { ... }
```
![divider](./assets/divider.small.png)
### `@Nested()`

Documents in ArangoDB can be nested. Make sure to define nested classes before the documents.

**Example**
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
![divider](./assets/divider.small.png)

### `@FromClient(mapper)`

Applied on client data when using `json()` inside a route.

**Example**
```ts
@Document()
@FromClient(doc => Object.assign(doc, {requestTime:new Date()})
class User extends Entity {}
```

![divider](./assets/divider.small.png)

### `@ForClient(mapper)`

Applied on response document when using `send()` inside a route.

**Example**
```ts
@Document()
@ForClient(doc => Object.assign(doc, {requestTime:new Date()})
class User extends Entity {}
```

![divider](./assets/divider.png)

### `@Attribute(schema?, readers?, writers?)`

Defines an attribute of the document. Uses [metadata reflection](https://github.com/rbuckton/reflect-metadata) to derive a Joi schema for the attribute by using the TypeScript type. Schemas will be validated when using routes or modifying entity instances.

- **schema**? `(enjoi: Enjoi, joi: Joi) => Joi` - a function where the first argument is a `Joi` type of the property metadata type (`Joi.string()` in the example below).
- **readers**? `string[]` - Roles with read permission to the attribute
- **writers**? `string[]` - Roles with write permission to the attribute

For more details on roles, see `@Authorized()`.

**Example**
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
 
**Example**
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

### `@Index(additionalFieldsOrType?, options?)`

Creates an index on the attribute.

- **additionalFieldsOrType**? `string[] | ArangoDB.IndexType` - A list of additional fields for the index or the index type.
- **options**? ``
  - **type**? `"hash" | "skiplist" | "fulltext" | "geo"`
  - **additionalFields**? `string[]`
  - **sparse?** `boolean`
  - **unique?** `boolean`
  - **deduplicate**? `boolean`
 
> **Warning**: Creating an index on an existing collections can take a some time.

**Example**
```ts
...
@Index(type => 'hash')
@Attribute()
name: string;

@Index(['height'], {type:'skiplist',sparse:true})
@Attribute()
age: number;
...
```
![divider](./assets/divider.small.png)

### `@OneToOne(type, relation?)`

Defines a 1:1 relation to another entity. Decorated properties have additional functions to fetch related entities, see `entity.relation`. See also [`entity.related('attribute')`](#entityrelatedattribute-keepattributes).

- **type**? `Entity` - The related document entity
- **relation**? `(TypeEntity) => TypeEntity.attribute` - TypeEntity is an object with the same keys as the related entity and can be used to create a relation to a certain field. The default relation is `Entity._key`.

**Example**
```ts
@Document()
class User extends Entity {
    // use @Attribute when relational data is stored in document
    @Attribute(string)
    @OneToOne(type => Address)
    primaryAddress: Related<Address>;
    
    // don't use @Attribute when the property is "virtual" and relational data is stored on the other end
    @OneToOne(type => Profile, Profile => Profile.owner)
    profile: Related<Profile>;
}
```

📘 [Read more on relations](examples/3-relations)

![divider](./assets/divider.small.png)

### `@OneToMany(type, relation?)`

Defines a 1:n relation to another entity. Mostly the same as `@OneToOne` except requesting the relation returns an array of entity instances instead of a single instance. See also [`entity.related('attribute')`](#entityrelatedattribute-keepattributes).

- **type**? `Entity` - The related document entity
- **relation**? `(TypeEntity) => TypeEntity.attribute` - See `@OneToOne`

**Example**
```ts
@Document()
class User {
    @OneToMany(type => Address, Address => Address.owner)
    addresses: Related<Address[]>;
}
```

![divider](./assets/divider.png)

### 👂 Listener

The `@Before.*` and `@After.*` decorators can be used as `ClassDecorator` (to apply a listener to a document) or as `PropertyDecorator` (to apply a listener to an attribute).

Both decorators provide the same methods with a slightly different resolver syntax.
- **Single listeners**
  - `.document(resolver)` - when a document is **loaded**
  - `.insert(resolver)` - when a document is **inserted**
  - `.update(resolver)` - when a document is **updated**
  - `.patch(resolver)` - when a document is **patched**
  - `.remove(resolver)` - when a document is **removed**
- **Combined listeners**
  - `.modify(resolver)` - when a document is either **updated** or **patched**
  - `.write(resolver)` - when a document is either **inserted**, **updated** or **patched**.


> **Warning:** Resolvers are executed when using [CRUD-Routes](#crud-like), the methods `document`, `insert`, `update`, `replace` and `remove` of [RouteArg](#routearg) or `save`, `insert`, `replace` & `remove` of an [Entity](#-entity) - but not when using `query`.

![divider](./assets/divider.small.png)

### `@Before.*(resolver)`
Executes the resolver before data from the database is read / inserted / updated / replaced or removed.

**Example**
```ts
@Document()
// avoids deletions
@Before.remove(doc => false)
class User {
    @Attribute()
    // use `new Date` as a default value when inserting documents
    @Before.insert(value => value || new Date)
    createdAt: Date;
}
```

![divider](./assets/divider.small.png)

### `@After.*(resolver)`
Executes the resolver after data from the database has been read / inserted / updated / replaced or removed.

**Example**
```ts
const MAP = ['one','two','three']

@Document()
// add virtual field to documents
@After.document(doc => Object.assign(doc, {extra:'free'}))
class User {
    @Attribute()
    @After.document(value => MAP[value])
    numericIndex: Date;
}
```

![divider](./assets/divider.small.png)
#### Types
- `DocumentData` - any object that is - or will become a document
- `ArangoDB.HttpStatus` - string of http status code (eg `forbidden` or `not-found`)
- `Passive` - `true` or `undefined` - does nothing
- `Cancel` - `false` or `ArangoDB.HttpStatus` - cancels the operation

##### Listener arguments when used as `ClassDecorator`

```ts
// Before a document will be loaded. The callback can cancel the request.
@Before.document( (loadDocumentKey: string, {_key, method}) => Passive | Cancel )

// After a document has been loaded. Can modify the loaded document before it's returned.
// Changes to loadedDocument are temporary until the response has been sent (like forClient).
@After.document( (loadedDocument: DocumentData, {_key, document, method}) => Passive | Cancel | DocumentData )

// Before a document is inserted. Can modify the document before it's written.
// Changes to insertDocument are permanent (like fromClient).
@Before.insert( (insertDocument: DocumentData, {json, method}) => Passive | Cancel | DocumentData)

// After a document has been inserted. Can modify the inserted document before it's returned.
// Changes to insertedDocument are temporary until the response has been sent (like forClient).
@After.insert( (insertedDocument: DocumentData, {_key, document, method}) => Passive | Cancel | DocumentData )

// Before a document is updated. Can modify the document before it's written.
// Changes to updateDocument are permanent (like fromClient).
@Before.update( (updateDocument: DocumentData, {_key, json, method}) => Passive | Cancel | DocumentData )

// After a document has been updated. Can modify the updated document before it's returned.
// Changes to updatedDocument are temporary until the response has been sent (like forClient).
@After.update( (updatedDocument: DocumentData, {_key, document, method} ) => Passive | Cancel | DocumentData )

// Before a document is replaced. Can modify the document before it's written.
// Changes to replaceDocument are permanent (like fromClient).
@Before.replace( (replaceDocument: DocumentData, {_key, json, method}) => Passive | Cancel | DocumentData)

// After a document has been replaced. Can modify the document before it's returned.
// Changes to replacedDocument are temporary until the response has been sent (like forClient).
@After.replace( (replacedDocument: DocumentData, {_key, document, method}) => Passive | Cancel | DocumentData )

// Before a document is removed. Can avoid deletions.
@Before.remove( (removeDocumentKey: string, {_key, method}) => Passive | Cancel )

// After a document has been removed.
@After.remove( (removedDocumentKey: string, {_key, method}) => Passive )
```

##### Listener arguments when used as `ClassDecorator`

```ts
// Before a document will be loaded. Rarely needed, available for the sake of completeness
@Before.document( (loadDocumentKey: string, {_key,attribute,method} ) => void )

// After an attribute has been loaded. Can modify the attribute before it's returned.
// Changes to attributeValue are temporary until the response has been sent (like forClient).
@After.document( (attributeValue: any, {_key, document, attribute, method}) => any )

// Before a document in inserted. Can modify the attribute before it's written.
// Changes to attributeValue are permanent (like fromClient).
@Before.insert( (insertAttributeValue: any, {json, attribute, method}) => any )

// After a document has been inserted. Can modify the inserted document before it's returned.
// Changes to insertedAttributeValue are temporary until the response has been sent (like forClient).
@After.insert( (insertedAttributeValue: any, {_key, document, attribute, method}) => any )

// Before a document is updated. Can modify the attribute before it's written.
// Changes to attributeValueToUpdate are permanent (like fromClient).
@Before.update( (updateAttributeValue: any, {_key, json, attribute, method}) => any )

// After a document has been updated. Can modify the updated attribute before it's returned.
// Changes to updatedAttributeValue are temporary until the response has been sent (like forClient).
@After.update( (updatedAttributeValue : any, {_key, document, attribute, method}) => any )

// Before a document is replaced. Can modify the attribute before it's written.
// Changes to documentToReplace are permanent (like fromClient).
@Before.replace( (replaceAttributeValue: any, {_key, json, attribute, method}) => any )

// After a document has been replaced. Can modify the attribute before it's returned.
// Changes to replacedDocument are temporary until the response has been sent (like forClient).
@After.replace( (replacedAttributeValue : any, {_key, document, attribute, method}) => any )

// Before a document is removed.
@Before.remove( (removeDocumentKey: string, {_key, attribute, method}) => void )

// After a document has been removed.
@After.remove( (removedDocumentKey: string, {_key, attribute, old, method}) => void )
```

> **Note:** Don't use listeners when you can use `@ForClient` / `@FromClient` instead.
 
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
  - **sort**? `string[]` - sorts the results AQL style, i.e. `['email DESC','name ASC']`
  - **limit?** `number | [offset, count]` - limits the results AQL style i.e. `[10, 2]`
  - **keep?** `string[]` - list attributes to load from collection
  - **unset?** `string[]` - instead of selecting attributes with `keep`, `unset` loads every other attribute, except the provided ones.

**Example**
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

**Example**
```ts
static route(){
    // returns a single User instance
    const user: User = Users.findOne('123');
}
```

![divider](./assets/divider.png)

### `@Collection(ofDocument, options?)`

Decorates a class that has been extended by `Entities`. Collections consume `@Document`*s* and provide routes.

- **ofDocument** `Entity | () => Entity` - the entity of the documents in the collection (can be omitted when options are provided).
- **option**? `ArangoDB.CreateCollectionOptions` - also see [ArangoDB Manual](https://www.arangodb.com/docs/3.4/data-modeling-collections-database-methods.html#create)
  - **of**? `string` - alias for argument `ofDocument`
  - **name**? `string` - the collection name, by default the class name is used
  - **creators** `string[]` - list of default creator roles
  - **readers** `string[]` - list of default reader roles
  - **updaters** `string[]` - list of default updater roles
  - **deleters** `string[]` - list of default deleter roles
  - **auth** `string[]` - alias for [@Route.auth](./API.md#routeauthauthorizefunctions)
  - **roles** `string[]` - alias for [@Route.roles](./API.md#routerolesrolefunctions)
  - **routes** `Array<Route | string>` - list of default routes to use - see [@Route.*](#route--get-post-put-patch-delete--list)
  - **relations** `string[] | true` - list of related attributes that can be read from client request to any route of the collection. Can also be set to `true` to expose all related attributes.
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

**Example**
```ts
@Collection(of => User)
class Users extends Entities { ... }
```
![divider](./assets/divider.small.png)

### `@Route.use(...methods, options?)`

Shortcut for creating multiple routes. Creates [`GET`](#routegetpath-schema-roles-summary-options), [`POST`](#routepostpath-schema-roles-summary-options), [`PUT`](#routeputpath-schema-roles-summary-options), [`PATCH`](#routepatchpath-schema-roles-summary-options), [`DELETE`](#routedeletepath-schema-roles-summary-options) & [`LIST`](#routelistschema-roles-summary-options) routes for the collection.

- **...methods** `string[]` - a list of methods or a preset name
- **options**? `Partial<RouteOpt>` - see [RouteOpt](#routeopt)

**Example**
```ts
@Collection(of => Company)
@Route.use('GET', 'POST', 'PATCH', 'PUT', 'DELETE')
class Companies extends Entities { ... }
```

#### Presets

Instead of writing out all the methods, extremely lazy developers can use common preset strings.

| Preset  | [GET](#routegetpath-schema-roles-summary-options) | [POST](#routepostpath-schema-roles-summary-options) | [PATCH](#routepatchpath-schema-roles-summary-options) | [PUT](#routeputpath-schema-roles-summary-options) | [DELETE](#routedeletepath-schema-roles-summary-options) | [LIST](#routelistschema-roles-summary-options) |
| -------        | --- | ---- | ----- | --- | ------ | ---- |
| `ALL+` or `*`  | ⚫  | ⚫    | ⚫    | ⚫  | ⚫     | ⚫   |
| `ALL`          | ⚫  | ⚫    | ⚫    | ⚫  | ⚫     | ⚪   |
| `CRUD+`        | ⚫  | ⚫    | ⚫    | ⚪  | ⚫     | ⚫   |
| `CRUD`         | ⚫  | ⚫    | ⚫    | ⚪  | ⚫     | ⚪   |

![divider](./assets/divider.small.png)

### `@Route.groups(creators, readers, updaters, deleters)`

Sets roles for all [CRUD-like](./API.md#crud-like) routes.

- **creators** `() => string[] | string[]` - required roles for `POST` requests
- **readers** `() => string[] | string[]` - required roles for `GET` and `LIST` requests
- **updaters** `() => string[] | string[]` - required roles for `PUT` and `PATCH` requests
- **deleters** `() => string[] | string[]` - required roles for `DELETE` requests

**Example**
```ts
@Collection(of => User)
// setup global roles for all requests below
@Route.groups(
    creators => ['guest'],
    readers => ['user']
)
@Route.use(['POST','GET'])
class Users extends Entities { ... }
```
![divider](./assets/divider.png)

### Route- `GET`, `POST`, `PUT`, `PATCH`, `DELETE` & `LIST`

The `ClassAndProperyDecorators` can be applied on either a static method or a class. When a class is decorated the route will behave as expected from the route method.

For additional details on these routes checkout the Swagger Docs at the `API` tab inside of the ArangoDB Web Interface.

![divider](./assets/divider.small.png)

### `@Route.roles(...roleFunctions)`

Takes a function to append additional roles for all requests to any route of the collection. It's mainly for generating user specific roles from the client `session`, eg adding a `viewer` role fow own documents.

- **roleFunction** `(arg: RouteRolesArg) => string[]` - a function returning additional roles to grant. The `RouteRolesArg` contain useful tools and information:
  - **req** `Foxx.Request`
  - **res** `Foxx.Response` 
  - **session** `(set?: Partial<Foxx.Session>) => Foxx.Session` - function to read or write the current session
  - **_key**? `string` - the document key of the current request when available
  - **document** `() => DocumentData` - loads & caches the document for the lifetime of the request
  - **collection** `ArangoDB.Collection` - the ArangoDB collection object
  - **path** `string` - the current path
  - **method** `"get" | "post" | "put" | "patch" | "delete"`
  - **aql** `ArangoDB.aql` - the ArangoDB AQL function used for queries
  - **~~query~~** `(query: ArangoDB.Query, options?: ArangoDB.QueryOptions) => ArangoDB.Cursor` - Deprecated, use <code>$\`AQL\`;</code> instead
  - **$** `(strings: TemplateStringsArray, ...args: any[]) => ArangoDB.Cursor` - Alias of the `query` function from the package `@arangodb`
  - **db** `ArangoDB.Database`
  - **roles**? `string[]`
  - **requestedAttributes** `string[]`
  - **hasAuth** `boolean`
  - **auth**? `RouteAuthorize`
  - **error** `(status: ArangoDB.HttpStatus, reason?: string) => Foxx.Response` - send an error response

**Example**
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
  - **method** `"get" | "post" | "put" | "patch" | "delete"`
  - **action** `"create" | "read" | "update" | "delete"`
  - **document** `DocumentData` - the requested document
  - **doc** `DocumentData` - alias for `document`
- **method** - 

**Example**
```ts
@Collection(of => User)
// allows access to documents with an user attribute qual to session.uid
@Route.auth(({doc, session}) => doc.user === session.uid)
class Users extends Entities { ... }
```
![divider](./assets/divider.small.png)

### `RouteArg`

All route functions receive a single argument, the `RouteArg` which contains useful information and tools to describe, authenticate, read and answer requests. A lot of them are well known from the Foxx routes.

- **req** `Foxx.Request`
- **res** `Foxx.Response`
- **method** `"get" | "post" | "put" | "patch" | "delete"`
- **action** `"create" | "read" | "update" | "delete" | "list"`
- **path** `string` - path of the route
- **param** `{[key: string]: any}` - object of (only) valid path- and query parameters
- **validParams** `string[]` - list of path- and query parameter names
- **roles** `string[]` - roles used to authorize the request
- **userRoles** `string[]` - all roles of the client
- **collection** `ArangoDB.Collection` - [collection object](https://www.arangodb.com/docs/3.4/data-modeling-collections-database-methods.html#collection) of the entity
- **_key** `string` - shortcut for `param._key`
- **exists** `(name: string) => boolean` - shortcut for `collection.exists`
- **document** `(key = _key) => Document` - resolves and caches a document for the lifetime of the request. Avoids duplicate reads. Loads the current document by default, can load other documents when called with an argument.
- **relations** `(data: DocumentData) => DocumentData` - loads and adds related entities (provided by `req.queryParams.relations`) to result. [📘 About relations](examples/3-relations)
- **insert** `(data: DocumentData) => ArangoDB.InsertResult` - inserts a document into the collection, executes callbacks from `@On.insert`.
- **update** `(dataOrKey = _key, dataOrOptions?, options?) => ArangoDB.UpdateResult` - updates a document of the collection, executes callbacks from `@On.update`. Uses `_key` as default document key.
- **replace** `(dataOrKey = _key, dataOrOptions?, options?) => ArangoDB.UpdateResult` - replaces a document of the collection, executes callbacks from `@On.replace`. Uses `_key` as default document key.
- **remove** `(keyOrOptions = _key, options?) => ArangoDB.RemoveResult` - removes a document of the collection, executes callbacks from `@On.remove`. Uses `_key` as default document key.
- **query** `(query: ArangoDB.Query, options?: ArangoDB.QueryOptions) => ArangoDB.Cursor` - executes a query
- **aql** `(strings: TemplateStringsArray, ...args: any[]) => ArangoDB.Query` - builds aql string
- **requestedAttributes** `string[]` - list of requested attributes
- **hasAuth** `boolean` - whether an authorization is required for the current route
- **auth** `(doc: DocumentData, method?: RouteMethod, action?: RouteAction) => false | DocumentData` - function to determine access to the document when working with [Route.auth](#routeauthauthorizefunctions)
- **json** `(omitUnwritableAttributes: boolean = true) => DocumentData` - returns request json without inaccessible attributes
- **send** `(data: DocumentData, omitUnreadableAttributes: boolean = true) => Foxx.Response` - strips inaccessible attributes based on roles and sends a response
- **error** `(status: ArangoDB.HttpStatus, reason?: string) => Foxx.Response` - function to response with an error
- **tags** `string[]` - tags used for the route (collection.name)
- **summary** `string` - the summary of the route
- **description** `string` - the description of the route
- **deprecated** `boolean` - whether the route has been deprecated

![divider](./assets/divider.small.png)

### `RouteOpt`

Routes can be further configured by using the following options.

- **relations**? `string[]` - list of relations that can be fetched using the query param `relations=entity1,entity2`. [📘 About relations](examples/3-relations)
- **body**? `RouteBody`
- **pathParams**? `[string, Schema, string?][]`
- **queryParams**? `[string, Schema, string?][]`
- **response**? `RouteResponse`
  - **description**? `string`
  - **mime** `string[]`
  - **schema** `Foxx.Schema | Foxx.Model`
  - **status** `RouteStatus`
- **errors**? `[RouteStatus, string][]`
- **path**? `string`
- **process**? `boolean`
- **handlerName**? `string`
- **handler**? `(arg: RouteArg) => any` - The handler of the current request
- **roles**? `string[]` - List of required roles for accessing the current request
  
![divider](./assets/divider.small.png)

### `@Route.GET(path?, schema?, roles?, summary?, options?)`

Creates a `GET` route on `collectionName/{_key}`.
 When used as a `ClassDecorator` a default route for returning a single document of the collection is created. When used on a static method of the collection a custom route executing the very same function with the [RouteArg](#routearg) argument will be created.

- **path**? `string` - a rich path string (can contain simple types, i.e. `/:var=number`)
- **schema**? `(enjoi: Enjoi) => Joi` - a Joi schema for accessing the request
- **roles**? `string[]` - roles required to access the route
- **summary**? `string | RouteOpt` - shortcut for `options.summary`
- **options**? `RouteOpt` - see [RouteOpt](#routeopt)

> The order of the arguments does not matter as long as the options are the last argument.

**Example**
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

Creates a `POST` route on `collectionName/{_key}`. Provides a route to create  documents by using `collection._insert`, when called as a `ClassDecorator`.

- **path**? `string` - a rich path string (can contain simple types, i.e. `/:var=number`)
- **schema**? `(enjoi: Enjoi) => Joi` - a Joi schema for accessing the request
- **roles**? `string[]` - roles required to access the route
- **summary**? `string | RouteOpt` - shortcut for `options.summary`
- **options**? `RouteOpt` - see [RouteOpt](#routeopt)

> The order of the arguments does not matter as long as the options are the last argument.

**Example**
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

Creates a `PATCH` route on `collectionName/{_key}`. Provides a route to update single documents by using `collection._update`, when called as a `ClassDecorator`.

- **path**? `string` - a rich path string (can contain simple types, i.e. `/:var=number`)
- **schema**? `(enjoi: Enjoi) => Joi` - a Joi schema for accessing the request
- **roles**? `string[]` - roles required to access the route
- **summary**? `string | RouteOpt` - shortcut for `options.summary`
- **options**? `RouteOpt` - see [RouteOpt](#routeopt)

> The order of the arguments does not matter as long as the options are the last argument.

**Example**
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

**Example**
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

Creates a `DELETE` route on `collectionName/{_key}`. Provides a route to remove single documents by using `collection._remove`, when called as a `ClassDecorator`.

- **path**? `string` - a rich path string (can contain simple types, i.e. `/:var=number`)
- **schema**? `(enjoi: Enjoi) => Joi` - a Joi schema for accessing the request
- **roles**? `string[]` - roles required to access the route
- **summary**? `string | RouteOpt` - shortcut for `options.summary`
- **options**? `RouteOpt` - see [RouteOpt](#routeopt)

**Example**
```ts
@Collection(of => User)
// executed as a ClassDecorator - creates a route on `DELETE users/:_key` to create Users
@Route.DELETE(roles => ['guest'])
class Users extends Entities { 
    // executed as a ProperyDecorator - creates a route on `DELETE users/baz`
    @Route.DELETE('baz', ['admin'])
    static DELETE({ res }: RouteArg){
        res.send('baz');
    } 
}
```
![divider](./assets/divider.small.png)

### `@Route.LIST(schema?, roles?, summary?, options?)`

Creates a `GET` route on `/collectionName` for returning a list of documents. Any provided `queryParams` will be used to filter the list. Additionally the parameters **limit**, **offset**, **sort** & **order** can be used. For more information see swagger docs.

- **schema**? `(enjoi: Enjoi) => Joi` - a Joi schema for accessing the requests `queryParams` Any values will be used to filter the result list. Use required attributes to avoid full collection access.
- **roles**? `string[]` - roles required to access the route
- **summary**? `string | RouteOpt` - shortcut for `options.summary`
- **options**? `RouteOpt` - see [RouteOpt](#routeopt)

**Example**
```ts
@Collection(of => User)
// creates a route on `GET users?country=US` 
// to return User[] with User.country == 'US'
@Route.LIST($ => ({country:['US','DE']}), roles => ['guest'])
class Users extends Entities {}
```
![divider](./assets/divider.small.png)

### `@AQLFunction(isDeterministic?, customName?)`

Extends AQL with a [User Function](https://www.arangodb.com/docs/stable/aql/extending.html). The function name is derived from the collection name and the method name. For example a `USERS::METHOD_NAME()`. The parameter order does not matter.

- **isDeterministic**? `() => boolean` - specify whether the function results are fully deterministic (i.e. depend solely on the input and are the same for repeated calls with the same input values).
- **customName**? `() => string` - by default the name of the function is concatenated from the collection- and  method name seprated by `::`. A different name can be provided, however the collection name will always be the prefix.

**Example**
```ts
@Collection(of => User)
class Users extends Entities {
    // registers "USERS::FUNCTION_NAME()"
    @AQLFunction(isDeterministic => true)
    static FUNCTION_NAME(arg){
        return true;
    }
    
    // registers"USERS::LAZYPI()"
    @AQLFunction(name => 'LAZIPI', isDeterministic => true)
    static IGNORED(arg){
        return 3.14;
    }
}
```

![divider](./assets/divider.small.png)

### `@Task(period, name?, params?)`

Creates a task with the [ArangoDB Task Management](https://www.arangodb.com/docs/3.4/appendix-java-script-modules-tasks.html). The task is either invoked once after startup (when using `period => 0`) or every `n` seconds. By default the task id equals to `CollectioName/MethodName`.

> ⚠️ It is important to note that the callback function is late bound and will be executed in a different context than in the creation context. The callback function must therefore not access any variables defined outside of its own scope. The callback function can still define and use its own variables. [Read more](https://www.arangodb.com/docs/3.4/appendix-java-script-modules-tasks.html#register-a-task)

- **period**? `() => number | Options` - number of seconds to wait in between executions. Note: when set to zero the function will be executed only once. This argument can also be an options object containing itself and the other arguments below (eg `{period:2,name:'abc'}`).
- **params**? `{[key:string}: any]` - to pass parameters to a task. Note that the parameters are limited to data types usable in JSON (meaning no callback functions can be passed as parameters into a task).
- **name**? `string` - names are informational only. They can be used to make a task distinguishable from other tasks also running on the server.

**Example**
```ts
@Collection(of => User)
class Users extends Entities {
    // executes the method every 10 seconds (task-id = "Users/MY_TASK")
    // Note: the below is equal to @Task({period:10,name:...,params:...})
    @Task(period => 10, name => 'Log something', {really:true})
    static MY_TASK(params){
        console.log('Hello World',params);
    }
}
```

![divider](./assets/divider.png)

### 🌐 `Type.I18n`

Provides simple internationalization support by storing strings in multiple languages as nested objects. If this type is returned in a request with a `locale` parameter or `session().data.locale` provided, only the respective value will be returned - or if none provided the english (`en`) value.

Set the query parameter `locale` to `*` in order to return all values from a route.

> Don't hesitate to use country specific languages like `de-CH`. When a provided locale has no direct match, the country code is ignored and the global locale value (`de`) will be returned.

**Example**
```ts
@Document()
class Page extends Entity {
    @Attribute()
    title: Type.I18n;
}

@Collection(of => Page)
@Route.GET()
class Pages extends Entities { }

// document in collection
{ "_key": "1", "title": { "en": "Hello World", "de": "Hallo Welt", "de-CH": "Grüezi Welt" } }

// request examples
// GET pages/1?locale=de-AT                        => {title:'Hallo Welt'} 
// GET pages/1 && session:{data:{locale:'de-CH'}}  => {title:'Grüezi Welt'} 
// GET pages/1                                     => {title:'Hello World'} 
// GET pages/1?locale=*                            => original value
```

![divider](./assets/divider.png)

### 🌐 `Type.Currencies`

Provides support for storing numbers in multiple currency objects: 

```
"price": {
    "EUR": 1,
    "USD": 1.12,
    "CAD": 1.45,
    ...
}
```

If this type is returned in a request with a `currency` parameter or `session().data.currency` provided, only the respective value will be returned - or if none provided the value of `config.defaultCurrency` (default: USD).

Set the query parameter `currency` to `*` in order to return all values from a route.

**Example**
```ts
@Document()
class Product extends Entity {
    @Attribute()
    price: Type.Currencies;
}

@Collection(of => Product)
@Route.GET()
class Products extends Entities { }

// document in collection
{ "_key": "1", "price": { "EUR": 1, "USD": 1.12, "CAD": 1.45 } }

// request examples
// GET products/1?currency=EUR                        => {price:1} 
// GET products/1 && session:{data:{currency:'CAD'}}  => {price:1.45} 
// GET products/1?currency=*                          => original value
```

![divider](./assets/divider.small.png)

### 🕒 `Type.DateInsert`

Sets a value of `new Date()` whenever a new document is created.

> This is really just another way of using the `@Before.insert(resolver)` decorator

**Example**
```ts
@Document()
class User extends Entity {
    @Attribute()
    createdAt: Type.DateInsert;
}

@Collection(of => User)
@Route.POST()
class Users extends Entities { }

// request
// POST /users/1 => {_key: "1", createdAt: "2019-03-18T12:00:00.000Z"} 
```

![divider](./assets/divider.small.png)

### 🕘 `Type.DateUpdate`

Sets a value of `new Date()` whenever a document is updated.

> This is really just another way of using the `@Before.insert(resolver)` decorator

**Example**
```ts
@Document()
class User extends Entity {
    @Attribute()
    updatedAt: Type.DateUpdate;
}

@Collection(of => User)
@Route.PATCH()
class Users extends Entities { }

// request
// PATCH /users/1 => {_key: "1", updatedAt: "2019-03-18T12:00:00.001Z"} 
```

![divider](./assets/divider.png)

### `@Description(string)`

Does not really do anything as of now. Can decorate a `Class`, `Propery` or `Method` and might be to used to further describe routes / entities in the future.

**Example**
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

### 📜 En-*(hanced)* Joi

Joi originates from plain JavaScript, but now that we have access to Types, it can be enhanced. Therefore type-arango comes with `Enjoi` which is a simple wrapper around `Joi`. Enjoi is especially useful when using the [@Attribute](#attributeschema-readers-writers) Decorator and it's always involved when there is a mention of `$ => ...` in an example.

**Example**
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

### Client operators inside query parameters
In order to allow clients to provide their own [operators](https://www.arangodb.com/docs/3.4/aql/operators.html) (ie. for [`LIST`](#routelistschema-roles-summary-options) or custom routes), the parameter schema of any route can be extended by calling the custom joi method `StringSchema.operator(nameOrList?)`.
 
 Clients can then provide the operator as a prefix of the parameter value - separated by `config.paramOperatorSeparator` (default `|`). For example `?attr=>=|10`.

> ==, !=, <, <=, >, >=, IN, NOT IN, LIKE, =~, !~

These parameters will be parsed by TypeArango in order to validate them and to transform the value into a tuple of `[OPERATOR, VALUE]` - it can then use it within its internal queryBuilder (for `LIST` requests).

They will also be documented in ArangoDBs Web Interface Swagger Docs.

#### Example setup
```ts
@Collection(of => User)
@Route.LIST('operator', $ => ({
    param1: $(String), // allow == (default)
    param2: $(String).operator('!=') //  allow !=
    param3: $(String).operator(['LIKE','NOT LIKE']), // u get the point
    param4: $(String).operator() // allow all: ==, !=, <, <=, >, >=, IN, NOT IN, LIKE
}))
class Users {
    @Route.GET('custom', $ => ({
        test: $(SomeEntity).someAttribute.operator(['!=', 'LIKE'])
    }))
    static GET_CUSTOM({param}): RouteArg {
        return param.test;
    }
}
```

#### Example requests / responses

```http
GET users/custom?test=LIKE|Searc%
Response 200: [ 'LIKE', 'Searc%']

GET users/custom?test=A
Response 200: [ '==', 'A']

GET users/custom?test=!!|Invalid
Response 200: [ '==', '!!|Invalid'] (invalid operators are ignored)

GET users/custom?test=>=|Nope
Response 400: query parameter "test" operator ">=" must be one of [!=, LIKE]
```

> Note: The operator `LIKE` is case-sensitive. When capitalization should be ignored the regexp operator `=~` can be combined with a flag (`?param==~|(?i)search`) to match case-insensitive.

![divider](./assets/divider.png)

### *"CRUD like"*

The decorator [`@Route.groups`](#routegroupscreators-readers-updaters-deleters) expects [CRUD](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete) roles but provides five instead of the expected four routes, this is intended because the `updateRoles` can either `PATCH` (update) or `PUT` (replace) an entity.


| Method | [CRUD](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete) | Roles |
| ------ | --------- | -------- |
| GET    | Read      | readers  |
| LIST   | Read      | readers  |
| POST   | Create    | creators |
| PATCH  | Update    | updaters |
| PUT    | Update    | updaters |
| DELETE | Delete    | deleters |

![divider](./assets/divider.small.png)

> Note: Fields have only two access roles: `readers` and `writers`.
