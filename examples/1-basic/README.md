## 🥑 Example #1: Basics

A minimal example of using `type-arango`.

In this example we will setup a basic user entity that will have the ArangoDB collection 
`users` with an `index` on the field `email` and six total routes to create, read, modify
and delete documents within the collection.

> ⚠ **Note**: The example overrirdes the `getAuthorizedRoles` config to deactivate
 the role system. This is should never be done in production and is solely
 for the simplicity of the this example.

**[./shared/User.entity.ts]()**:
```ts
import { Field, Collection, Route, Index, RouteArgs } from 'type-arango';

@Collection()
@Route.all()
export class User {
	@Field() name: string;
	
	@Index()
	@Field(string => string.email())
	email: string;
}
```

Setup a basic `User` entity with [CRUD like](../../README.md#CRUD-like) routes.
 
- `@Collection` looks for the collection `users` and creates it, in case it does not 
exist.
- `@Field` marks the property as a database field of the entity.
The first argument can be a function receiving a `joi` object and returning an input validation schema.
- `@Index` creates a `hash` index on the field `email`.
- `@Route.all` creates [CRUD like](../../README.md#CRUD-like) routes for the entity.


**[./shared/index.ts]()**:
```ts
import typeArango, { LogLevel } from 'type-arango'

typeArango({
	getAuthorizedRoles(){ return ['admin'] },
	logLevel: LogLevel.Debug
});

export * from './User';
```

The entities `index.ts` configures `typeArango` before it exports the entites.
- `getAuthorizedRoles` returns `['admin']` for presentation purposes, **do not use this in a public environment.**
- Activate debug logs (view in `arangod`)
For details, see [configuration](../../README.md#configuration).

**[./foxx/main.ts]()**:
```ts
import { context } from '@arangodb/locals'
import { createRoutes } from 'type-arango'
import createRouter from '@arangodb/foxx/router'

import * as _Entities from '../shared-entities'

context.use(
    createRoutes(
        createRouter()
    )
);
```

TypeArango requires the Foxx router in order to be able to setup the
previously created routes. `createRoutes` is also responsible for managing the 
swagger docs inside of ArangoDBs Web Interface.

---
The [next example](../2-roles) is about manging access scopes using the built in `roles` system.