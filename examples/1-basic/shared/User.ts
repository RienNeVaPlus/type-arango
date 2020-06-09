import {Attribute, Collection, Document, Entities, Entity, Index, Route, RouteArg} from '../../../src' // type-arango

@Document()
export class User extends Entity {
	@Index() // creates a hash index on User.email
	@Attribute(type => type.email()) // validates changes to user.email to be email addresses
	email: string;

	@Attribute()
	name: string;
}

// creates the collection Users
@Collection(of => User)
// creates three routes
@Route.use('GET','POST','PATCH')
export class Users extends Entities {
	// creates & documents a route on /users/custom/:user
	@Route.GET('custom/:user=number')
	static GET_CUSTOM({param,error}: RouteArg){
		const user = Users.findOne(param.user);
		if(!user) return error('not found');
		return user;
	}
}