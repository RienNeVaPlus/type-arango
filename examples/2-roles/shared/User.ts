import { Field, Collection, Authorized, Route, Index, RouteArgs } from '../../../src'; // type-arango

// makes sure the collection "users" exists
@Collection({name:'users'})
// creates five CRUD like routes (GET=read, POST=create, PUT=replace, PATCH=update, + DELETE)
@Route.all(
	creators => ['guest'],					// POST
	readers => ['viewer','admin'],	// GET
	updaters => ['viewer','admin'],	// PATCH & PUT
	deleters => ['admin']						// DELETE
)
export class User {
	@Field()
	name: string;

	// creates a hash index on User.email
	@Index(type => 'skiplist')
		// validates changes to user.email to be email addresses
	@Field(type => type.email())
	email: string;

	// limits a field to a specific read or write audience
	@Authorized(readers => ['viewer'], writers => ['admin'])
	@Field()
	secret: string;

	// creates & documents the route GET /users/custom/:param?add=0
	@Route.GET(
		path => 'custom/:param=boolean?add=number',
		roles => ['admin'], {
		summary: 'Custom',
		description: `Custom request to /custom/true?add=1 demanding a body of {data:string}`
	})
	static GET_CUSTOM({send,collection}: RouteArgs){
		const someKey = 'abc';
		send(collection.document(someKey));
	}

	// overwrites the native POST route created by the ClassDecorator `@Route.all`
	@Route.POST(roles => ['viewer'])
	static POST({send,json,collection}: RouteArgs){
		send(collection.insert(json()));
	}
}