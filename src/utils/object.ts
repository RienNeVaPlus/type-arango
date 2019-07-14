export function removeValues(obj: any, ...values: any[]){
	Object.keys(obj).forEach(key => values.includes(obj[key]) && delete obj[key]);
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

export function isObject(input: any){
	return input != null && input.constructor.name === "Object"
}