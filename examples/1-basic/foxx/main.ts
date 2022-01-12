import { createRoutes } from '../../../src/' // type-arango
import { context } from '@arangodb/locals'
import createRouter from '@arangodb/foxx/router'

// Import the entities before creating the routes
import * as _Entities from '../shared'

// Derive the routes from your entities after they have been decorated and export the router to Foxx
context.use( createRoutes( createRouter() ) )