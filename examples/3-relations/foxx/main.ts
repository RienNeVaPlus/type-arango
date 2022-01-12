import { createRoutes } from '../../../src/' // type-arango
import { context } from '@arangodb/locals'
import createRouter from '@arangodb/foxx/router'

// Import entities and collections before creating routes
import * as _Collections from './collections'

// Derive the routes from your entities after they have been decorated and export the router to Foxx
context.use( createRoutes( createRouter() ) )