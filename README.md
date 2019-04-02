<p align="center">
  <img src="./logo.png" alt="TypeArango" />
</p>

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

[![last-commit][github-last-commit]][github-last-commit-url]
[![version][github-version]][github-version-url]
[![npm][npm-badge]][npm-badge-url]
[![license][npm-license]][npm-license-url]
![size][shields-size]

## Example

```ts
import {Collection, Route, Document, Field, Index, Email, Int } from 'type-arango'
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


## Getting started
### 1. Setup ArangoDB Foxx service
If you don't have a foxx service running yet, you can create one by using [arangodb-typescript-setup](https://github.com/RienNeVaPlus/arangodb-typescript-setup).

type-arango requires ArangoDB `3.4.4` or newer.

### 2. Install `type-arango`
```
npm i --save-dev type-arango
```
or
```
yarn add --dev type-arango
```


### 3. Initialize `type-arango`

In order for the decorators to work, `initTypeArango()` has to be called **before** any entity is parsed. It returns `true` when the current environment is Foxx.

#### shared/entities/index.ts
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

### 4. Create routes
When using the `@Route` decorator, it is required to provide the `Foxx.Router` to type-arango by calling `createRoutes(router)`.

#### foxx-service/main.ts
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


[github-version]: https://img.shields.io/github/package-json/v/riennevaplus/type-arango.svg
[github-version-url]: https://github.com/RienNeVaPlus/type-arango/blob/master/package.json
[github-last-commit]: https://img.shields.io/github/last-commit/riennevaplus/type-arango.svg
[github-last-commit-url]: https://github.com/RienNeVaPlus/type-arango/commits/master
[npm-badge]: https://img.shields.io/npm/v/type-arango.svg
[npm-badge-url]: https://www.npmjs.com/package/type-arango
[npm-license]: https://img.shields.io/npm/l/type-arango.svg
[npm-license-url]: https://github.com/ionic-team/stencil/blob/master/LICENSE
[shields-size]: https://img.shields.io/github/repo-size/riennevaplus/type-arango.svg
