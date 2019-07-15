import { createRoutes } from '../../../src/' // type-arango
import { context } from '@arangodb/locals'
import sessionsMiddleware from '@arangodb/foxx/sessions'
import jwtStorage from '@arangodb/foxx/sessions/storages/jwt'
import createRouter from '@arangodb/foxx/router'

// Setup any session middleware, this is the default from ArangoDB using JWT
context.use( sessionsMiddleware({
	storage: jwtStorage('YOUR_SECRET'),
	transport: 'header'
}) );

// Import entities and collections before creating routes
import * as _Collections from './collections';

// Derive the routes from your entities after they have been decorated and export the router to Foxx
context.use( createRoutes( createRouter() ) );