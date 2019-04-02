import { context } from '@arangodb/locals';
import {createRoutes} from '../../../src/';
import createRouter from '@arangodb/foxx/router';

// Import the entities before creating the routes
import * as _Entities from '../shared';

// Derive the routes from your entities after they have been decorated and export the router to Foxx
context.use( createRoutes( createRouter() ) );