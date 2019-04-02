## 🥑 Example #2: Authorization Roles

An example of using the **access role system** of `type-arango`. Please have a look at the [basic example](../1-basic) first.

When working with public endpoints it becomes necessary to protect the data.
TypeArango provides a `role` system that can be integrated either with ArangoDBs
built-in [session middleware](https://docs.arangodb.com/devel/Manual/Foxx/Reference/Sessions/) 
or any other authentication system that can provide an array of roles (`string[]`).

**[./shared/User.entity.ts]()**:
```ts
import { Field, Collection, Authorized, Route, Index, RouteArgs } from '../../../src'; // type-arango

@Collection({name:'users'})
@Route.all(
	creators => ['guest'],			// POST
	readers => ['viewer','admin'],	// GET
	updaters => ['viewer','admin'],	// PATCH & PUT
	deleters => ['admin']			// DELETE
)
export class User {
	@Authorized(readers => ['viewer'], writers => ['admin'])
	@Field()
	secret: string;

	@Route.GET(
		path => 'custom/:param=boolean?add=number',
		roles => ['admin','support], {
		summary: 'Custom',
		description: `Custom request to /custom/true?add=1 demanding a body of {data:string}`
	})
	static GET_CUSTOM({send,collection}: RouteArgs){
		const someKey = 'abc';
		send(collection.document(someKey));
	}

	@Route.POST(path => '!noUsers', roles => ['viewer'])
	static POST({send,json,collection}: RouteArgs){
		send(collection.insert(json()));
	}
	
	@Route.DELETE()
	static DELETE({res}){ res.sendStatus(418); }
}
```

Setup a basic `User` entity with [CRUD like](../../README.md#CRUD-like) and a custom routes.
 
1. `@Route.all` created the CRUD like routes and protects them with the provided roles. 

2. `@Route.GET` creates a custom route GET `/users/custom?add=0` accessible by users with 
the role `admin` or `support`.

3. `@Route.POST` creates a custom route **not** bound to the entities namespace `users`
 (indicated by the starting `!` on the path) to `/noUsers`

4. `@Route.DELETE` - or any route without a `path` - overrides the previously created route from `@Route.all`

**[./shared/index.ts]()**:
```ts
import typeArango, { LogLevel } from 'type-arango'

typeArango({
	logLevel: LogLevel.Debug,
	getUserRoles(req: Foxx.Request): Roles {
		return req.session && req.session.data && req.session.data.roles || [];
	},
	getAuthorizedRoles(userRoles: Roles, accessRoles: Roles): Roles {
		return userRoles.filter((role: string) => accessRoles.includes(role));
	},
	unauthorizedThrow: 'unauthorized',
});

export * from './User';
```

The entities `index.ts` configures `typeArango` before it exports the `entites`.

1. Activate debug logs (view in `arangod`), for details, see [configuration](../../README.md#configuration).
2. `getUserRoles` should always return the roles of the current user or `[]`.
3. The example shown above equals the default configuration value. No need to provide it when 
`req.session.data.roles` can be populated.
4. `getAuthorizedRoles` returns a subset of roles contained in `userRoles` and 
`accessRoles`. The above is also the default value.

**[./foxx/main.ts]()**:
```ts
import { context } from '@arangodb/locals'
import {createRoutes} from 'type-arango'
import sessionsMiddleware from '@arangodb/foxx/sessions'
import jwtStorage from '@arangodb/foxx/sessions/storages/jwt'
import createRouter from '@arangodb/foxx/router'

context.use( sessionsMiddleware({storage: jwtStorage('YOUR_SECRET'), transport: 'header'}) );

import * as _Entities from '../shared-entities';

const router = createRoutes( createRouter() );

router.get('login', req => {
	req.session!.data = {
		roles: ['admin']
	};
}).summary('Dummy login').description('Foxx session middleware with `type-arango`');

// export router to Foxx (default)
context.use(router);
```

The Foxx service is using ArangoDBs [session-middleware](https://docs.arangodb.com/devel/Manual/Foxx/Reference/Sessions/).
 with the [JWT Session Storage](https://docs.arangodb.com/devel/Manual/Foxx/Reference/Sessions/Storages/JWT.html).
 
The `/login` route responds with an example JWT in the header field `X-SESSION-ID` thats
required to access any a protected endpoint or field.

---
The [next example](../3-routes) is about detaching routes from the entities onto seperate `EntitiyRoutes`.