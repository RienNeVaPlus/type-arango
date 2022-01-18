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
type PeriodFn = (returns?: any) => number | TaskOptions
type NameOrParam = string | {[key:string]: any}
type NameOrParamFn = ((returns?: any) => NameOrParam) | NameOrParam

export function Task(options: TaskOptions): MethodDecorator
export function Task(period: PeriodFn, name?: NameOrParam, param?: NameOrParam): MethodDecorator
export function Task(
  periodOrOptions: ((returns?: any) => number | TaskOptions) | number | TaskOptions,
  paramsOrName?: NameOrParamFn,
  nameOrParam?: NameOrParamFn
): MethodDecorator {
  return (prototype: any, attribute: string | symbol) => {
    if(!isActive) return
    if(typeof attribute === 'symbol')
      throw new SymbolKeysNotSupportedError()

    const col = getCollectionForContainer(prototype)
    let period = argumentResolve(periodOrOptions)
    let params = argumentResolve(paramsOrName)
    let name = argumentResolve(nameOrParam)
    let id = col.name+'/'+attribute
    let offset

    if(typeof period === 'object'){
      params = period.params
      name = period.name
      id = period.id || id
      period = period.period
      offset = period.offset
    }
    else {
      if(typeof name === 'object'){
        params = name
        name = params
      }
      else if(typeof params === 'string'){
        params = name
        name = params
      }
    }

    col.decorate('Task', {prototype,attribute,period,offset,id,name,params})
  }
}