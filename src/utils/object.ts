export function removeUndefined(obj: any){
	Object.keys(obj).forEach(key => obj[key] === undefined && delete obj[key]);
	return obj;
}

export function filterKeys(obj: any, valid?: string[]){
	if(!valid) return obj;
	Object.keys(obj).forEach(key => !valid.includes(key) && delete obj[key]);
	return obj;
}