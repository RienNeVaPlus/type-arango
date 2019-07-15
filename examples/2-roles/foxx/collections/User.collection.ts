// makes sure the collection "users" exists
import {Collection, Entities, Route, RouteArg} from '../../../../src';
import {User} from '../../shared';

// start a new collection containing User entities
@Collection(of => User)

// add collection specific roles to client requests (eg viewer for the own user)
@Route.roles(
	({session, _key}) => session().uid === _key ? ['viewer'] : []
)

// minimalistic route initializer to create, read & update users
@Route.GET(roles => ['guest', 'viewer', 'admin'])
@Route.PATCH(roles => ['viewer', 'admin'])

// the collection class, constructor.name is used as collection.name
export class Users extends Entities {
	/**
	 * Creates a new user
	 */
	@Route.POST('register', roles => ['guest'], $ => ({
		...$(User),
		password: $(String)
	}))
	static REGISTER({json}: RouteArg){
		const auth = require('@arangodb/foxx/auth')();
		const { password, ...user } = json();

		return new User({
			...user,
			roles: ['user'],
			secret: 42,
			auth: auth.create(password)
		}).save()
	}

	/**
	 * Login route
	 * Provides the X-Session-Id header required for further requests
	 */
	@Route.POST('login', $ => ({
		email: $(User).email,
		password: $(String).min(6)
	}))
	static LOGIN({json,error,session}: RouteArg){
		const { email, password } = json();
		const user = Users.findOne({filter:{email}, keep:['_key', 'auth', 'roles']});

		// authenticate
		const auth = require('@arangodb/foxx/auth')();
		if(!user || !auth.verify(user.auth, password))
			return error('unauthorized');

		// write and return session
		return session({
			uid: user._key,
			data: {
				roles: user.roles
			}
		});
	}
}