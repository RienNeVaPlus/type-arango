export function removeUndefined(obj: any){
	Object.keys(obj).forEach(key => obj[key] === undefined && delete obj[key]);
	return obj;
}

export function pick<T, K extends keyof T>(obj: T, valid?: K[]): Pick<T, K> {
	if(!valid) return obj;
	Object.keys(obj).forEach(key => !valid.includes(key as K) && delete (<any>obj)[key]);
	return obj;
}

export function omit<T, K extends keyof T>(obj: T, valid?: K[]): Pick<T, K> {
	if(!valid) return obj;
	Object.keys(obj).forEach(key => valid.includes(key as K) && delete (<any>obj)[key]);
	return obj;
}