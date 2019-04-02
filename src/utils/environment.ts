export function isFoxx(){
	let is = false;
	try {
		require('@arangodb/locals');
		is = true;
	} catch(e){}
	return is;
}