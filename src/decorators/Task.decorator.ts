import {isActive} from '..'
import {getCollectionForContainer} from '../models'
import {SymbolKeysNotSupportedError} from '../errors'
import {argumentResolve} from '../utils'

interface TaskOptions {
	period: number
	id: string
	name: string
	offset: number
	params: {[key:string]:any}
}
type PeriodFunc = (returns?: any) => number | TaskOptions;
type NameOrParam = string | {[key:string]: any};
type NameOrParamFunc = ((returns?: any) => NameOrParam) | NameOrParam;

export function Task(options: TaskOptions): MethodDecorator;
export function Task(period: PeriodFunc, name?: NameOrParam, param?: NameOrParam): MethodDecorator;
export function Task(
	periodOrFunctionOrOptions: ((returns?: any) => number | TaskOptions) | number | TaskOptions,
	paramsOrNameOrFunction?: NameOrParamFunc,
	nameOrParamOrFunction?: NameOrParamFunc
): MethodDecorator {
	return (prototype: any, attribute: string | symbol) => {
		if(!isActive) return;
		if(typeof attribute === 'symbol')
			throw new SymbolKeysNotSupportedError();

		const col = getCollectionForContainer(prototype);
		let period = argumentResolve(periodOrFunctionOrOptions);
		let params = argumentResolve(paramsOrNameOrFunction);
		let name = argumentResolve(nameOrParamOrFunction);
		let id = col.name+'/'+attribute;
		let offset;

		if(typeof period === 'object'){
			params = period.params;
			name = period.name;
			id = period.id || id;
			period = period.period;
			offset = period.offset;
		}
		else {
			if(typeof name === 'object'){
				params = name;
				name = params;
			}
			else if(typeof params === 'string'){
				params = name;
				name = params;
			}
		}

		col.decorate('Task', {prototype,attribute,period,offset,id,name,params});
	}
}