import {SymbolKeysNotSupportedError} from '../errors'
import {Entities, Entity, getCollectionForContainer, getDocumentForContainer} from '../models'
import {isActive} from '../index';

export function Description(
	description: string
) {
	return function(prototype: any, attribute?: string | symbol): any {
		if(!isActive) return;
		if(typeof attribute === 'symbol')
			throw new SymbolKeysNotSupportedError();

		const data = {prototype, attribute, description};

		if(prototype instanceof Entity || prototype.prototype instanceof Entity){
			getDocumentForContainer(prototype.prototype||prototype)
				.decorate('Description', data);
		}
		else if(prototype instanceof Entities || prototype.prototype instanceof Entities){
			getCollectionForContainer(prototype.prototype||prototype)
				.decorate('Description', data);
		}

		if(!attribute)
			return prototype;
	}
}