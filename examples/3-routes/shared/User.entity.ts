import {Collection, Field} from '../../../src'; // type-arango

// makes sure the collection "users" exists
@Collection()
export class User {
	@Field()
	name: string;

		// validates changes to user.email to be email addresses
	@Field(type => type.email())
	email: string;
}