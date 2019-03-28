import { context } from '@arangodb/locals';

export function isFoxx(){
	return !(context === undefined);
}