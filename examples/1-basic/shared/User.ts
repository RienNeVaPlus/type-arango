import { Field, Collection, Route, Index, RouteArgs } from '../../../src';

// makes sure the collection "users" exists
@Collection()
// creates all five CRUD like routes (GET=read, POST=create, PUT=replace, PATCH=update, + DELETE)
@Route.all()
export class User {
	// creates a hash index on User.email
	@Index()
	// validates changes to user.email to be email addresses
	@Field(type => type.email())
	email: string;

	@Field()
	name: string;

	// creates & documents a route on /users/custom/:param?add=0
	@Route.GET(path => 'custom/:param=boolean?add?=number')
	static GET_CUSTOM({json,send}: RouteArgs){
		send(json());
	}
}