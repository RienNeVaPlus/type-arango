import * as Joi from 'joi'
import {Schema} from 'joi'
import {findDocumentForContainer, getDocumentForContainer} from '../models'
import {isObject} from '.'

type Presence = 'required' | 'optional';

/**
 * Convert type or alias to joi
 */
export function toJoi(inp: any, presence: Presence = 'optional'){
	if(inp && inp.isJoi)
		return inp;

	let j: Schema = Joi.any();

	if(!inp){}
	else if(isObject(inp)){
		if(inp.prototype){
			const doc = getDocumentForContainer(inp);
			if(doc) j = Joi.object().keys(doc.schema);
		} else {
			Object.keys(inp).forEach(k => inp[k] = toJoi(inp[k]));
			j = Joi.object().keys(inp);
		}
	} else if(Array.isArray(inp)){
		j = Joi.any().valid(...inp);
	} else {
		switch(inp){
			case String:
			case 'string': j = Joi.string(); break;

			case Number:
			case 'number': j = Joi.number(); break;

			case Array:
			case 'array': j = Joi.array(); break;

			case Boolean:
			case 'boolean': j = Joi.boolean(); break;

			case 'binary': j = Joi.binary(); break;

			case Date:
			case 'date': j = Joi.date(); break;

			case Function:
			case 'func':
			case 'function': j = Joi.func(); break;

			case Object:
			case 'object': j = Joi.object(); break;

			case 'any': j = Joi.any(); break;

			case 'alternatives': j = Joi.alternatives(); break;

			default:
				if(!inp) break;

				// console.log('TYPE OF ------------->', typeof inp);

				if(inp.prototype){
					const doc = getDocumentForContainer(inp);
					if(doc) j = Joi.object().keys(doc.schema); break;
				}

				j = Joi.any();
				break;
		}
	}

	if(presence === 'required'){
		j = j.required();
	}

	return j;
}

/**
 * Enhance joi a little
 */
export function enjoi(inp?: string | any, presence: Presence = 'optional') {
	if(inp === undefined)
		return Joi;

	const type = typeof inp;

	if(isObject(inp)){
		return toJoi(inp, presence);
	}

	if(type === 'function'){
		const doc = findDocumentForContainer(inp);
		return doc ? doc.schema : toJoi(inp, presence);
	}

	return toJoi(inp);
}

export function joiDefaults(obj: any, override: any = {}){
	return obj._inner.children.reduce((res: any, child: any) => {
		const key = child.key;
		if(child.schema._type == 'object'){
			res[key] = joiDefaults(child.schema, override[key]);
		} else {
			if(override[key] || child.schema._flags.default)
				res[key] = override[key] || child.schema._flags.default;
		}
		return res;
	}, {});
}