export function argumentResolve(val: Function | any, ...arg: any) {
	return typeof val === 'function' ? val(...arg) : val;
}