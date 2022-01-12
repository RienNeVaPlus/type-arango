# 👥 Example #2: Authorization Roles

An example of using the **access role system** of `type-arango`. Please have a look at the [basic example](../1-basic) first.

When working with public endpoints it becomes necessary to protect certain attributes or enitre routes.
TypeArango provides a `role` system that can be integrated either with ArangoDBs
built-in [session middleware](https://docs.arangodb.com/devel/Manual/Foxx/Reference/Sessions/) 
or any other authentication system that can provide an array of roles (`string[]`).

![divider](../../assets/divider.small.png)

#### **[./shared/User.entity.ts]()**:
```ts
import {Attribute, Document, Entity, Index, Nested} from 'type-arango'

@Nested()
class UserAuth {
    @Attribute()
    method: string
    
    @Attribute()
    hash: string
    
    @Attribute()
    salt: string
}

@Document()
export class User extends Entity {
    @Attribute()
    name: string
    
    @Index(type => 'skiplist')
    @Attribute(string => string.email(), readers => ['viewer', 'admin'])
    email: string
    
    @Attribute(readers => ['admin'])
    auth: UserAuth
    
    @Attribute((array, $) => array.items($(String)), readers => ['viewer'], writers => ['admin'])
    roles: string[]
    
    @Attribute(readers => ['viewer', 'admin'], writers => ['admin'])
    secret: string
}
```

Describes the `User` entity and it's attributes as known from the previous example. In addition to the attribute types, the [`@Attribute`](../../API.md#attributeschema-readers-writers) decorator can also take `readers` and `writers` roles. Whenever a document is read or written, attributes without matching roles are being unset.

There is also a [`@Nested`](../../API.md#nested) document which is used to store authorization information from Foxx's internal `@arangodb/foxx/auth` library.

![divider](../../assets/divider.small.png)

#### **[./foxx/collections/User.collection.ts]()**:
```ts
import {Collection, Entities, Route, RouteArg} from '../../../../src'
import {User} from '../../shared'

@Collection(of => User)
@Route.roles(({session, _key}) => session().uid === _key ? ['viewer'] : [])
@Route.GET(roles => ['guest', 'viewer', 'admin'])
@Route.PATCH(roles => ['viewer', 'admin'])
export class Users extends Entities {
    @Route.POST('register', $ => ({
            ...$(User),
            password: $(String)
        }),
        roles => ['guest'],
        summary => 'Creates a new User'
    )
    static REGISTER({json}: RouteArg){
        const auth = require('@arangodb/foxx/auth')()
        const { password, ...user } = json()
        return new User({
            ...user,
            roles: ['user'],
            secret: 42,
            auth: auth.create(password)
        }).save()
    }
    
    @Route.POST(
        path => 'login',
        summary => 'Auth user and init session',
        $ => ({
            email: $(User).email,
            password: $(String).min(6)
        })
    )
    static LOGIN({json,error,session}: RouteArg){
        const { email, password } = json()
        const user = Users.findOne({filter:{email}, keep:['_key', 'auth', 'roles']})
    
        const auth = require('@arangodb/foxx/auth')()
        if(!user || !auth.verify(user.auth, password))
            return error('unauthorized')
    
        return session({
            uid: user._key,
            data: {
                roles: user.roles
            }
        })
    }
}
```

Creates the `Users` collection with various routes. Note how every route can have it's own roles. The optional [`@Route.roles`](../../API.md#routerolesfunct) function can also provide collection and session specific roles to determine extended access permissions (`viewer`) for own documents.

These four routes are created by the collection:

#### `POST users/register`
Creates a new user. Provide a body with `name, email, password` attributes.

#### `POST users/login`
Generates a `X-Session-Id` token required for authentication of protected routes. Provide a body with `email` and `password`.

#### `GET users/{uid}`
Returns the user depending on the clients roles. Call either with or without the `X-Session-Id` header in order to see the difference caused by the attribute roles.`

#### `PATCH users/{uid}` 
Updates the user when a valid `X-Session-Id` header with a matching `uid` is provided.

![divider](../../assets/divider.small.png)

#### **[./shared/index.ts]()**:
```ts
import typeArango, { LogLevel, config } from '../../../src' // type-arango

const complete = typeArango({
	// verbose
	logLevel: LogLevel.Debug,

	// clients will always have these roles, no mather if they're authenticated (also see getUserRoles)
	providedRolesDefault: ['guest'],

	// when a route has no roles assigned, these roles will be required
	requiredRolesFallback: ['user'],

	// when a route has no writer roles assigned, these roles will be required
	requiredWriterRolesFallback: ['admin'],

	// extracts the users `roles` from req.session.data.roles (this is the default config value)
	getUserRoles(req: Foxx.Request): string[] {
		return (req.session && req.session.data && req.session.data.roles || []).concat(config.providedRolesDefault)
	},

	// returns the user access roles that can be applied to the current route (this is the default config value)
	getAuthorizedRoles(userRoles: string[], accessRoles: string[]): string[] {
		return userRoles.filter((role: string) => accessRoles.includes(role))
	}
})

export * from './User.entity'

complete()
```

The `shared/index.ts` file configures `typeArango` before it exports the entities.

1. Activate debug logs (view in `arangod`), for details, see [configuration](../../API.md#-configuration).
2. `getUserRoles` should always return the roles of the current user concatenated with the global role `guest`.
3. The example above equals the default configuration value. No need to provide it when 
`req.session.data.roles` can be populated.
4. `getAuthorizedRoles` returns a subset of roles contained in `userRoles` and 
`accessRoles`. The above is also the default value.

![divider](../../assets/divider.small.png)

#### **[./foxx/main.ts]()**:
```ts
import { context } from '@arangodb/locals'
import {createRoutes} from '../../../src/'
import sessionsMiddleware from '@arangodb/foxx/sessions'
import jwtStorage from '@arangodb/foxx/sessions/storages/jwt'
import createRouter from '@arangodb/foxx/router'

// Setup any session middleware, this is the default from ArangoDB using JWT
context.use( sessionsMiddleware({
	storage: jwtStorage('YOUR_SECRET'),
	transport: 'header'
}) )

// Import entities and collections before creating routes
import * as _Collections from './collections'

// Derive the routes from your entities after they have been decorated and export the router to Foxx
context.use( createRoutes( createRouter() ) )
```

![divider](../../assets/divider.png)

The Foxx service is using ArangoDBs [session-middleware](https://docs.arangodb.com/devel/Manual/Foxx/Reference/Sessions/)
 with the [JWT Session Storage](https://docs.arangodb.com/devel/Manual/Foxx/Reference/Sessions/Storages/JWT.html).
 