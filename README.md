# type-arango 🥑

Powerful tools and decorators for [ArangoDB](https://www.arangodb.com) [Foxx Apps](https://docs.arangodb.com/3.4/Manual/Foxx/) when working with TypeScript.

`type-arango` creates and manages your AragngoDB `collections`, `routes` and `documents` by using a single, centralized entity system which can be consumed by any `backend`, `frontend`, and / or `Foxx service` - no need to have environment specific schemas anymore.

With the decorators, a single entity can:
- Create a collection of the entity
- Create a document schema
- Add indexes to specific collection keys
- Setup routers for CRUD operations
- Manage permissions and validations
- Provide ORM functions for the entity

**⚠ Warning: This repo is in active development and not completed yet.**

## Example

```ts
import {Collection, Document, Field, Index, Email, Int } from 'type-arango'
import {Address} from './entity/address'

@Collection({keyOptions:{type:'autoincrement'}})
@Route.all(
    creators => ['guest'],
    readers => ['user','admin'],
    writers => ['viewer','admin'],
    deleters => ['admin']
)
export class User extends Document {
    @Field(type => Email)
    @Index({type:'hash',unique:true})
    email: string;
    
    @Field()
    name: string;
    
    @Field()
    @Authorized(readers => ['viewer','admin'])
    address: Address;
    
    @Field(type => Int)
    @Authorized(readers => ['viewer','admin'], writers => ['admin'])
    rating: number;
}
```


## Setup
#### 1. Setup ArangoDB Foxx service
If you don't have a foxx service running yet, you can create one by using [arangodb-typescript-setup](https://github.com/RienNeVaPlus/arangodb-typescript-setup).

type-arango requires ArangoDB `3.4.4` or newer.

#### 2. Install `type-arango`
```
npm i --save-dev type-arango
```
or
```
yarn add --dev type-arango
```


#### 3. Initialize `type-arango`

`initTypeArango()` has to be called **before** any decorator can be used. It returns `true` when the current environment is Foxx.

##### shared/entities/index.ts
```ts
import { initTypeArango } from 'type-arango';

initTypeArango({
	pluralizeCollectionName: true,
	prefixCollectionName: false, // maps collection names with module.context.collectionName
	stripDocumentId: true, // stips _id from documents
	stripDocumentRev: true, // strips _rev from documents
	stripDocumentKey: false // strips _key from documents
});

// import and export the entities after calling initTypeArango
export * from './user';
```

#### 4. Create routes
##### foxx-service/main.ts
When using the `@Route` decorator, it is required to provide the `Foxx.Router` to type-arango by calling `createRoutes(router)`.

```ts
import createRouter from '@arangodb/foxx/router';
import {createRoutes} from 'type-arango';

// make sure the entities are ready and initTypeArango has been called
import * as _Entities from 'shared/entities';

// create the Foxx router
const router = createRouter();

// tell type-arango to create routes defined by @Route
createRoutes(router);

// custom routes stay the same
router.get(...);
```

## Todos

- ☑ Allow to be run in all environments / activate only in foxx
- ☑ Create collections using `@Collection`
- ☑ Create indexes using `@Index`
- ☑ Create fields using `@Field`
- ☑ Create routes using `@Route.*` (get,post,patch,put,delete)
- ☑ Create all routes using `@Route.all(creators, readers, updaters, deleters)`
- ☐ Implement scalars
- ☐ Access fields using `@Authorized(readerRoles, writerRoles)`
- ☐ ORM
- ☐ Validation

```ts
// work in progress:

User.get('primaryKey'): User
User.findOne({filter,return,omit,skip,take,sort,join}): User
User.find({filter,return,omit,skip,take,sort,join}): User[]
let user = User.create({email:'mail@example.com'});

user.email; // mail@example.com
user.update({email:'new@example.com'});
user.remove();

// # is replaced with collection name
User.query(`FOR x IN # FILTER x._key == 1 RETURN x`);
```

## Credits
type-arango is inspired by [type-graphql](https://github.com/19majkel94/type-graphql).