# type-arango

Tools for [ArangoDB](https://www.arangodb.com) [Foxx Apps](https://docs.arangodb.com/3.4/Manual/Foxx/) when working with TypeScript.

## Example

```ts
// creates the collection
@Collection({keyOptions:{type:'autoincrement'}})
export class User extends Model {
    // Adds index to field "email"
    @Index({type:'hash',unique:true})
    email: string;
}
```

## Todos
- ☑ Create collections using `@Collection`
- ☑ Create indexes using `@Index`
- ☐ ORM
- ☐ Authenticaion
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