import {isFoxx} from './utils';

export interface Opt {
	pluralizeCollectionName?: boolean;
	prefixCollectionName?: boolean;
}

export * from './decorators/collection.decorator';
export * from './model/model';
export * from './decorators/index.decorator';
export let isActive: boolean = false;
export let opt: Opt = {
	pluralizeCollectionName: true,
	prefixCollectionName: false
};

export default function initializeTypeArango(options: Opt){
	opt = Object.assign(opt, options);
	isActive = isFoxx();
}