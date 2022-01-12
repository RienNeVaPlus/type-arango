import {Joi} from '../joi'
import {Schema} from 'joi'
import {findDocumentForContainer, getDocumentForContainer} from '../models'
import {isObject} from '.'

type Presence = 'required' | 'optional'

/**
 * Convert type or alias to joi
 */
export function toJoi(inp: any, presence: Presence = 'optional'){
  if(inp){
    if(inp.isJoi)
      return inp
    if(inp.schema)
      return inp.schema
  }

  let j: Schema = Joi.any()

  switch(inp){
    case String:
    case 'string': j = Joi.string(); break

    case Number:
    case 'number': j = Joi.number(); break

    case Array:
    case 'array': j = Joi.array(); break

    case Boolean:
    case 'boolean': j = Joi.boolean(); break

    case 'binary': j = Joi.binary(); break

    case Date:
    case 'date': j = Joi.date(); break

    case Function:
    case 'func':
    case 'function': j = Joi.func(); break

    case Object:
    case 'object': j = Joi.object(); break

    case null:
    case 'any': j = Joi.any(); break

    case 'alternatives': j = Joi.alternatives(); break

    default:
      if(!inp) break

      if(Array.isArray(inp)){
        j = Joi.any().valid(...inp)
      }
      else if(isObject(inp)){
        if(inp.prototype){
          const doc = getDocumentForContainer(inp)
          if(doc) j = Joi.object().keys(doc.schema); break
        } else {
          Object.keys(inp).forEach(k => inp[k] = toJoi(inp[k]))
          j = Joi.object().keys(inp)
        }
      }
      // @Nested
      else if(typeof inp === 'function' && findDocumentForContainer(inp)){
        j = findDocumentForContainer(inp)!.joi
      }
      break
  }

  if(!j){
    j = Joi.any()
  }

  if(presence === 'required'){
    j = j.required()
  }

  return j
}

/**
 * Enhance joi a little
 */
export function enjoi(inp?: string | any, presence: Presence = 'optional') {
  if(inp === undefined)
    return Joi

  // return document schema for entity references
  if(typeof inp === 'function'){
    const doc = findDocumentForContainer(inp)
    return doc ? doc.schema : toJoi(inp, presence)
  }

  return toJoi(inp, presence)
}

export function joiDefaults(obj: any, override: any = {}){
  return Array.isArray(obj._inner.children) ? obj._inner.children.reduce((res: any, child: any) => {
    const key = child.key

    if(child.schema._type == 'object'){
      res[key] = joiDefaults(child.schema, override[key])
    } else {
      // convert strings to integer / floats when the attribute type is a number (this should be done by joi's .validate, inside ArangoDB Foxx)
      if(override[key] && child.schema._type === 'number'){
        override[key] = child.schema._tests.find((t:any) => t.name === 'integer') ? parseInt(override[key], 10) : parseFloat(override[key])
      }

      if(override[key] || child.schema._flags.default)
        res[key] = override[key] || child.schema._flags.default
    }

    return res
  }, {}) : undefined
}