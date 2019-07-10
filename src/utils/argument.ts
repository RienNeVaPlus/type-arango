export function argumentResolve(val: Function | any, ...arg: any): any {
	return typeof val === 'function' ? val(...arg) : val;
}