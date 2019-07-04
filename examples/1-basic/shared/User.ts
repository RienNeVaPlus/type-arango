import { Document, Entity, Collection, Entities, Route, Attribute, Index, RouteArg } from '../../../src';


@Document()
export class User extends Entity {
	// creates a hash index on User.email
	@Index()
	// validates changes to user.email to be email addresses
	@Attribute(type => type.email())
	email: string;

	@Attribute()
	name: string;
}

// creates the collection Users
@Collection(of => User)
// creates all five `CRUD like` routes (GET=read, POST=create, PUT=replace, PATCH=update, DELETE=remove)
@Route.all()
export class Users extends Entities {
	// creates & documents a route on /users/custom/:user
	@Route.GET(path => 'custom/:user=number')
	static GET_CUSTOM({req,error}: RouteArg){
		const user = Users.findOne(req.param('user'));
		if(!user) return error('not found');
		return user;
	}
}