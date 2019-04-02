import { context } from '@arangodb/locals';
import {createRoutes} from '../../../src/';
import sessionsMiddleware from '@arangodb/foxx/sessions'
import jwtStorage from '@arangodb/foxx/sessions/storages/jwt';
import createRouter from '@arangodb/foxx/router';

// Create the router like you normally would
const router = createRouter();

// Setup any session middleware, this is the default from ArangoDB using JWT
context.use(sessionsMiddleware({storage: jwtStorage('YOUR_SECRET'), transport: 'header'}));

// Import  your entities before creating the routes
import * as _Entities from '../shared';

// Derive the routes from your entities after they have been decorated
createRoutes(router);

// Append the roles to req.session.data, this would be integrated within a custom login routine.
// The example returns a JWT in the "X-Session-ID" response header, read it and send it in further requests.
// Read more about Foxx Sessions: https://docs.arangodb.com/devel/Manual/Foxx/Reference/Sessions/
router.get('login', req => {
	req.session!.data = {
		roles: ['admin']
	};
}).summary('Dummy login').description('Foxx session middleware with `type-arango`');

// export router to Foxx (default)
context.use(router);