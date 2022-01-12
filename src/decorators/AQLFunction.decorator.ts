import {isActive} from '..'
import {getCollectionForContainer} from '../models'
import {SymbolKeysNotSupportedError} from '../errors'
import {argumentResolve} from '../utils'

type NameFunc = (returns?: void) => string
type IsDeterministicFunc = (returns?: void) => boolean

export function AQLFunction(): MethodDecorator
export function AQLFunction(name: NameFunc | string, isDeterministic?: IsDeterministicFunc | boolean): MethodDecorator
export function AQLFunction(isDeterministic: IsDeterministicFunc | boolean, name?: NameFunc | string): MethodDecorator
export function AQLFunction(
  nameOrIsDeterministicOrFunction?: NameFunc | IsDeterministicFunc | boolean | string,
  isDeterministicOrNameOrFunction?: NameFunc | IsDeterministicFunc | boolean | string
): MethodDecorator {
  return (prototype: any, attribute: string | symbol) => {
    if(!isActive) return
    if(typeof attribute === 'symbol')
      throw new SymbolKeysNotSupportedError()

    const col = getCollectionForContainer(prototype)
    let name = argumentResolve(nameOrIsDeterministicOrFunction)
    let isDeterministic = argumentResolve(isDeterministicOrNameOrFunction)
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