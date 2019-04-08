<p align="center">
  <img src="./logo.png" alt="TypeArango" />
</p>

<h5 align="center">
    Powerful decorators for <a href="https://www.arangodb.com">ArangoDB</a> <a href="https://docs.arangodb.com/3.4/Manual/Foxx/">Foxx Apps</a> when working with TypeScript.
</h5>

<p align="center">
	TypeArango creates and manages your ArangoDB <code>collections</code>, <code>routes</code> and <code>documents</code> by using a single,<br/>centralized entity system which can be consumed by any <strong>backend</strong>, 
	<strong>frontend</strong>, and / or <strong>Foxx service</strong>.<br/><sub><i>No more need to maintain environment specific schemas.</i></sub>
</p>

<h2 align="center"><sup>🥑</sup></h2>

### Features
- **Beautiful Code** thanks to decorators
- **A single Schema** for all js or ts environments
- **Manages ArangoDB Collections** by deriving their names from the entity class name
- **Manages ArangoDB Indexes** by decorating fields with `@Index(type, options)`
- **Auto Schema from Types** derives typing information into `joi` schemas
- **Auto Documentation** optimized swagger docs from types and decorators
- **Route Decorators** for creating and documenting `Foxx.Routes` by typing `@Route.POST(input => string())`.
- **Field-based Authorization** with `reader` and `writer` roles
- **Route-based Authorization** with `creators`, `readers`, `updaters` and `deleters`
- **[CRUD like](#crud-like) Route Setup** with `@Route.all(roles)`
- **Custom Routes** with `@Route.GET(path => 'add/:feature=string?id=number')` input schemas and access roles
- **Validate Input Data** by describing the entity or providing joi schemas for routes
- **Request specific fields** by providing a `keys` parameter to the endpoint (like SQL SELECT)
- **Logging integrated** for an easy setup and debugging
- **Quick start [examples](./examples)** included

> 🌞 **TypeArango is in active development and will receive additional features.**

[![last-commit][github-last-commit]][github-last-commit-url]
[![version][github-version]][github-version-url]
[![npm][npm-badge]][npm-badge-url]
[![license][npm-license]][npm-license-url]
![size][shields-size]

## Example

```ts
import { Collection, Route, Index, Field, Authorized } from 'type-arango'

@Collection({keyOptions:{type:'autoincrement'}})
@Route.all(
    creators => ['guest'],
    readers => ['user','admin'],
    writers => ['viewer','admin'],
    deleters => ['admin']
)
export class User {
    @Index(type => 'hash')
    @Field(str => str.email())
    email: string;
    
    @Field()
    name: string;
    
    @Authorized(readers => ['viewer','admin'], writers => ['admin'])
    @Field(nr => nr.min(0).max(100))
    rating: number;
    
    @Route.POST(
        path => 'add/:type=string?id=number',
        body => body.string().min(5),
        roles => ['viewer']
    ) static GET({json,send){
        send(json());
    }
}
```


## Getting started

### 1. Setup ArangoDB Foxx service

If you don't have a foxx service running yet, you can create one by using 
[arangodb-typescript-setup](https://github.com/RienNeVaPlus/arangodb-typescript-setup).

TypeArango requires ArangoDB `3.4.4` or newer.

### 2. Install `type-arango`

```
npm i --save-dev type-arango
```
or
```
yarn add --dev type-arango
```

### 3. Initialize TypeArango

In order for the decorators to work, `typeArango()` has to be called **before**
any entity is imported.

**shared/entities/index.ts**:
```ts
import typeArango from 'type-arango'

typeArango({
    // Configuration
});

export * from './user';
```

`typeArango()` should be called before the decorators are used. It returns the
current configuration ([see below](#configuration) for details).

### 4. Create routes
When using the `@Route` decorator, it is required to provide the `Foxx.Router`
to TypeArango by calling `createRoutes(router)`.

**foxx-service/main.ts**:
```ts
import createRouter from '@arangodb/foxx/router';
import {createRoutes} from 'type-arango';

// Initialize all entities before creating the routes
import * as _Entities from 'shared/entities';

// Create the foxx router and hand it to type-arango
const router = createRoutes( createRouter() );

// Custom routes work as they used to
router.get(...);
```

As the routes are built by the `@Route.*` decorators, it is required to import all
entities before calling `createRoutes(Foxx.Router)`.

The router can still be used to setup normal Foxx routes.


## Examples

Various examples of how to use TypeArango with certain features can be found in the
**[examples folder](./examples)** of this repository.

## Configuration

```ts
/**
 * Pluralize the collection name (class User => collection.users)
 */
pluralizeCollectionName: boolean = true;

/**
 * Prefix the collection name by applying `module.context.collectionName` to it
 */
prefixCollectionName: boolean = false;

/**
 * Display the source of your routes in Swagger
 */
exposeRouteFunctionsToSwagger: boolean = true;

/**
 * Always add field writer roles to field reader roles
 * By default an `@Authorized(readers => ['user'], writers => ['admin'])`
 * evaluates to `readers = ['users','admin'], writers = ['admin']`
 */
addFieldWritersToFieldReaders: boolean = true;

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
 * Available log levels are Error, Warn, Info, Debug
 */
logLevel: LogLevel = LogLevel.Warn;

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
 * HTTP Status to return when an unauthorized request occurs
 */
unauthorizedThrow: ArangoDB.HttpStatus = 'unauthorized';
```

## *"CRUD like"*

The decorator `@Route.all` expects [CRUD](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete) roles but provides five instead of the expected four routes, this is intended because the `updateRoles` can either `PATCH` (update) or `PUT` (replace) an entity.


| Method | [CRUD](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete) | Roles |
| ------ | --------- | -------- |
| GET    | Read      | readers  |
| POST   | Create    | creators |
| PATCH  | Update    | updaters |
| PUT    | Update    | updaters |
| DELETE | Delete    | deleters |

> Note: Fields have only two access roles: `readers` and `writers`.

## Documentation

API Documentation will be available soon, until then have a look at the [examples](./examples) and the [decorator sources](./src/decorators).

## Credits
- type-arango is heavily inspired by [type-graphql](https://github.com/19majkel94/type-graphql) and [typeorm](https://github.com/typeorm/typeorm).
- Avocado drawing by [FreePik](https://www.freepik.com/free-photos-vectors/background)


[github-version]: https://img.shields.io/github/package-json/v/riennevaplus/type-arango.svg
[github-version-url]: https://github.com/RienNeVaPlus/type-arango/blob/master/package.json
[github-last-commit]: https://img.shields.io/github/last-commit/riennevaplus/type-arango.svg
[github-last-commit-url]: https://github.com/RienNeVaPlus/type-arango/commits/master
[npm-badge]: https://img.shields.io/npm/v/type-arango.svg
[npm-badge-url]: https://www.npmjs.com/package/type-arango
[npm-license]: https://img.shields.io/npm/l/type-arango.svg
[npm-license-url]: https://github.com/ionic-team/stencil/blob/master/LICENSE
[shields-size]: https://img.shields.io/github/repo-size/riennevaplus/type-arango.svg
