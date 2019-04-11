import {isFoxx} from "../utils";

export const arango = isFoxx() ? require('@arangodb') : null;
export const db = isFoxx() ? arango.db : null;
