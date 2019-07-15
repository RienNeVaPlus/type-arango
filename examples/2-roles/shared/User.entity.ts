import {Attribute, Document, Entity, Index, Nested} from '../../../src' // type-arango

// creates a nested object for the users auth
@Nested()
class UserAuth {
	@Attribute()
	method: string;

	@Attribute()
	hash: string;

	@Attribute()
	salt: string;
}

// describe the user
@Document()
export class User extends Entity {
	@Attribute()
	name: string;

	@Index(type => 'skiplist')
	@Attribute(string => string.email(), readers => ['viewer', 'admin'])
	email: string;

	@Attribute(readers => ['admin'])
	auth: UserAuth;

	@Attribute((array, $) => array.items($(String)), readers => ['viewer'], writers => ['admin'])
	roles: string[];

	@Attribute(readers => ['viewer', 'admin'], writers => ['admin'])
	secret: string;
}