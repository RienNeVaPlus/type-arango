import {isFoxx} from "../utils";

export const arango = isFoxx() ? require('@arangodb') : new (require('arangojs'));
export const db = isFoxx() ? arango.db : null;
