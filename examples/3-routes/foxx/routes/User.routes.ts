import {RouteArgs, Route} from '../../../../src';
import {User} from '../../shared';

@Route.enable(
	creators => ['guest'],					// POST
	readers => ['viewer','admin'],	// GET
	updaters => ['viewer','admin'],	// PATCH & PUT
	deleters => ['admin']						// DELETE
)
export class UserRoutes extends User {
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

	// creates & documents the route POST /users/:_key inheriting the `creators` roles from `Route.enable`
	@Route.POST()
	static POST({send,json,collection}: RouteArgs){
		send(collection.insert(json()));
	}
}