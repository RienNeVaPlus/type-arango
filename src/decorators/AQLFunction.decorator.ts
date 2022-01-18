import {isActive} from '..'
import {getCollectionForContainer} from '../models'
import {SymbolKeysNotSupportedError} from '../errors'
import {argumentResolve} from '../utils'

type NameFn = (returns?: void) => string
type IsDeterministicFn = (returns?: void) => boolean

export function AQLFunction(): MethodDecorator
export function AQLFunction(name: NameFn | string, isDeterministic?: IsDeterministicFn | boolean): MethodDecorator
export function AQLFunction(isDeterministic: IsDeterministicFn | boolean, name?: NameFn | string): MethodDecorator
export function AQLFunction(
  nameOrIsDeterministic?: NameFn | IsDeterministicFn | boolean | string,
  isDeterministicOrName?: NameFn | IsDeterministicFn | boolean | string
): MethodDecorator {
  return (prototype: any, attribute: string | symbol) => {
    if(!isActive) return
    if(typeof attribute === 'symbol')
      throw new SymbolKeysNotSupportedError()

    const col = getCollectionForContainer(prototype)
    let name = argumentResolve(nameOrIsDeterministic)
    let isDeterministic = argumentResolve(isDeterministicOrName)
    let tmp: any

    if(typeof name === 'boolean'){
      if(typeof isDeterministic === 'boolean')
        tmp = isDeterministic
      isDeterministic = name
      name = tmp
    }

    if(name && !name.startsWith(col.name+'::'))
      name = col.name+'::'+name

    if(!name)
      name = col.name+'::'+attribute

    col.decorate('Function', {prototype, attribute, name: name.toUpperCase(), isDeterministic})
  }
}