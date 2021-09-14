# 📌 Example #3: Relations

An example of working with relations in type-arango. Please have a look at the [basic example](../1-basic) first.

Related attributes are decorated by [@OneToOne](../../API.md#onetoonetype-relation) or [@OneToMany](../../API.md#onetomanytype-relation). The [@Attribute](../../API.md#attributeschema-readers-writers) decorator can be omitted when the attribute does not store any data. However when the same attribute has a value, it is used to look up the related entity.

Relations can either be fetched inside custom routes by using [entity.related('attribute')](../../API.md#entityrelatedattribute-keepattributes) or by simply providing the query parameter `relations` on default routes.

![divider](../../assets/divider.small.png)

### Example Setup

```ts
import { Document, Entity, Entities, OneToMany, Related } from 'type-arango'

@Document() class Author extends Entity {
    @Attribute()
    name: string;
    
    @OneToMany(type => Book, Books => Books.author)
    books: Related<Book[]>;
    
    @Attribute(type => number)
    @OneToMany(type => Book)
    favorites: Related<Book[]>;
}

@Document() class Book extends Entity {
    @Attribute()
    title: string;
    
    @Attribute(type => number)
    @OneToOne(type => Author)
    author: Related<Author>
}

// Authors
[{
    "_key": 1,
    "name": "Hermann Hesse",
    "favorites": [2,3]
}, ...]

// Books
[{
    "_key": 1,
    "title": "Steppenwolf",
    "author": 1
}, ...]

@Collection(of => Author)
@Route.GET({relations:['books']})
class Authors extends Entities {}

@Collection({of: Book, relations: ['author'], routes: ['LIST']})
class Books extends Entities {}
```

The code above creates the collections Authors and Books. Both collections have a route (Author GET & Books LIST) and expose a single relation.

**Note:** it does not matter whether the routes are created by using the [@Collection(options)](../../API.md#collectionofdocument-options) or additional [@Route.*](../../API.md#routegetpath-schema-roles-summary-options) decorators.

![divider](../../assets/divider.small.png)


### Load relations from the client side

The `relations` property of the `@Collection` decorator indicates which of the available relations can be exposed by the routes. For example, the route `GET authors` can optionally return all `books` of the author when called with the query parameter `relations=books`.
The property can be set on a collection basis (with [CollectionOpt](../../API.md#collectionofdocument-options)) and or for ever route by using [RouteOpt](../../API.md#routeopt).

![divider](../../assets/divider.small.png)

### Example Requests

Fetching all Books, their Authors and their favorite books:

```
GET ../books?relations=author,author.favorites
[
    {
        "_key": 1,
        "title": "Steppenwolf",
        "author": {
            "_key": 1,
            "name": "Hermann Hesse",
            "favorites": [Book2, Book3] // you get the point
        }
    }
]
```

Note: Use `attributes=book.name` to omit all other attributes from the response.

![divider](../../assets/divider.small.png)

### Custom route

type-arango provides the method `related` for loading related & exposed entities inside custom routes. The following example appends all authors to the books in case the client requests them by providing the query parameters `relations=author`.

```ts
@Collection(of => Book)
class Books extends Entities {
    @Route.GET('custom', {relations:'author'})
    static GET_CUSTOM({relations}: RouteArg){
        const book = Books.findOne(1);
        return relations(book);
    }
}
```

![divider](../../assets/divider.small.png)

#### Virtual relations

Virtual relations are the simplest type of relations. They don't require any information to be stored, and the attribute does not exist in the database - therefore the `@Attribute` decorator is not used. 

#### Link relations

Link relations are attributes containing either a single or a list of references to the related document/s.

### Tuple link relations 
The values of link relations can be tuples `[KEY, VALUE]` containing an additional value, which will be merged with the related document within `_value`:

```
{
    "ratings": [
        [ 2, { stars: 5 } ],
        [ 5, { stars: 3 } ]
    ]
}

// The computed value will be merged with the related document as `_value`:
{
    "ratings": [
        { ...DOCUMENT(2), _value: { stars: 5 } },
        { ...DOCUMENT(5), _value: { stars: 3 } }
    ]
}
```

> Note: Make sure to define the attribute `_value` and it's permissions on the related document schema, otherwise the value will be stripped.

![divider](../../assets/divider.small.png)

### Documentation

All relations are automatically documented within the swagger docs of the ArangoDB Web Interface.

![divider](../../assets/divider.png)


 