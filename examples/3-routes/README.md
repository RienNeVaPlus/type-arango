## 🥑 Example #3: Detached Routes

In the [previous example](../2-roles) the `type-arango` generated routes have been directly 
attached to the globally shared entities.  

Attaching them directly can become a problem, because even though `static` members
are used, they still pollute the entity on a level where it does not have to.
Especially because the routes are only required by Foxx, an not the other 
environments that might consume the `entities`.

Therefore you can detach all routes from the entity by providing Foxx 
specific route classes that extend any `entity`.

**[./foxx/routes/User.route.ts]()**:
```ts
import {RouteArgs, Route} from 'type-arango'
import {User} from '../../shared-entities'

@Route.enable(
    creators => ['guest'],		// POST
    readers => ['viewer','admin'],	// GET
    updaters => ['viewer','admin'],	// PATCH & PUT
    deleters => ['admin']		// DELETE
)
export class UserRoutes extends User {
    @Route.GET(
        path => 'custom/:param=boolean?add=number',
        roles => ['admin']
    )
    static GET_CUSTOM({send,collection}: RouteArgs){
        const someKey = 'abc';
        send(collection.document(someKey));
    }

    @Route.POST()
    static POST({send,json,collection}: RouteArgs){
        send(collection.insert(json()));
    }
}
```

By having seperate routes, the entity is now much more readable.

**[./shared/User.entity.ts]()**:
```ts
import {Collection, Field} from 'type-arango'

@Collection()
export class User {
    @Field()
    name: string;
    
    @Field(type => type.email())
    email: string;
}
```