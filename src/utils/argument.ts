export function argumentResolve(arg: Function | any): any {
	return typeof arg === 'function' ? arg() : arg;
}