import {isFoxx} from './utils';
import {Collection, Route} from './models';

interface Opt {
	pluralizeCollectionName?: boolean;
	prefixCollectionName?: boolean;
	stripDocumentId?: boolean;
	stripDocumentKey?: boolean;
	stripDocumentRev?: boolean;
}

export {Document,createRoutes} from './models';
export {Collection,Route,Field,Index,Authorized} from './decorators';
export * from './scalars';

export let isActive: boolean = false;

export let opt: Opt = {
	pluralizeCollectionName: true,
	prefixCollectionName: false,
	stripDocumentId: true,
	stripDocumentRev: true,
	stripDocumentKey: false
};

export let collections: Collection[] = [];
export let routes: Route[] = [];

export function initTypeArango(options: Opt): boolean {
	isActive = isFoxx();
	if(!isActive) return false;
	opt = Object.assign(opt, options);
	return true;
}