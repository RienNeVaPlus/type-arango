# 🥑 Example #1: Basics

A minimal example of using `type-arango`.

In this example we will setup a basic user entity that will have the ArangoDB collection 
`users` with an `index` on the field `email` and six total routes to create, read, modify
and delete documents within the collection.

> ⚠ **Note**: The example overrirdes the `getAuthorizedRoles` config to deactivate
 the role system. This is should never be done in production and is solely
 for the simplicity of the this example.
 
![divider](../../assets/divider.small.png)

#### **[./shared/User.ts]()**:
```ts
import { Document, Entity, Collection, Entities, Route, Index, Attribute, RouteArgs } from 'type-arango'

@Document()
export class User extends Entity {
    @Index()
    @Attribute(type => type.email())
    email: string
    
    @Attribute()
    name: string
}

@Collection(of => User)
@Route.use('GET','POST','PATCH')
export class Users extends Entities {
    @Route.GET('custom/:user=number')
    static GET_CUSTOM({param,error}: RouteArg){
        const user = Users.find(param.user)
        if(!user) return error('not found')
        return user
    }
}
```

Setup a basic `User` entity and it's collection with three routes.
 
- [`@Document`](../../API.md#document) initializes an entity
  - [`@Attribute`](../../API.md#attributeschema-readers-writers) marks the property as a database field of the entity.
  The first argument can be a function receiving a [Enjoi](../../API.md#-en-hanced-joi) object of it's defined type (`Joi.string()` above) and returning an input validation schema.
  - [`@Index`](../../API.md#indextype-options) creates a `hash` index on the field `email`.
  - [`@Collection`](../../API.md#collectionofdocument-options) looks for the collection `Users` and creates it, in case it does not 
exist.
  - [`@Route.use`](../../API.md#routeusemethods-options) creates preset & documented routes for the collection.

![divider](../../assets/divider.small.png)

#### **[./shared/index.ts]()**:
```ts
import typeArango, { LogLevel } from 'type-arango'

const complete = typeArango({
	getAuthorizedRoles(){ return ['admin'] },
	logLevel: LogLevel.Debug
})

export * from './Users'

complete()
```

The entities `index.ts` configures type-arango before it exports the entities.
- `getAuthorizedRoles` returns `['admin']` for presentation purposes, **do not use this in a public environment.**
  - Activate debug logs (printed in `arangod` or `/var/log/arangodb3/arangod.log`). 

For details, see [configuration](../../API.md#-configuration).

![divider](../../assets/divider.small.png)

#### **[./foxx/main.ts]()**:
```ts
import { context } from '@arangodb/locals'
import { createRoutes } from 'type-arango'
import createRouter from '@arangodb/foxx/router'

import * as _Entities from '../shared-entities'

context.use(
    createRoutes(
        createRouter()
    )
)
```

TypeArango requires the Foxx router in order to be able to setup the
previously created routes. `createRoutes` is also responsible for managing the 
swagger docs inside of ArangoDBs Web Interface.

![divider](../../assets/divider.png)

The [next example](../2-roles) is about manging access scopes using the built in `roles` system.