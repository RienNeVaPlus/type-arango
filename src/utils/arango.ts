import {isFoxx} from "../utils";

export const arango = isFoxx() ? require('@arangodb') : null;//new (require('arangojs'));
export const db = isFoxx() ? arango.db : null;