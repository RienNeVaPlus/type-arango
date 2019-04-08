import {Schema} from 'joi';
import * as Joi from 'joi'
import {findCollectionForContainer} from '../models';

/**
 * Convert type or alias to joi
 */
export function toJoi(inp: any, isArray: boolean = false): Schema {
	if(isArray){
		return Joi.array().items(toJoi(inp));
	}

	const type = typeof inp;
	if(inp && type === 'object' && inp.isJoi)
		return inp;

	let j;
	switch(inp){
		default:
			// if(inp.prototype){
			// 	let i = new inp;
			// 	return Joi.string();
			// }
			return Joi.string();
		case String:
		case 'string': return Joi.string();

		case Array:
		case 'array': return Joi.array();

		case Boolean:
		case 'boolean': return Joi.boolean();

		case 'binary': return Joi.binary();

		case Date:
		case 'date': return Joi.date();

		case Function:
		case 'func':
		case 'function': return Joi.func();

		case Number:
		case 'number': return Joi.number();

		case Object:
		case 'object':
			return Joi.object();

		case 'any': return Joi.any();

		case 'alternatives': return Joi.alternatives();
	}
	return j;
}

/**
 * Enhance joi a little
 */
export function enjoi(inp?: string | any){
	if(inp === undefined)
		return Joi;

	const type = typeof inp;

	if(type === 'object'){
		Object.keys(inp).forEach(k => inp[k] = toJoi(inp[k]));
		return Joi.object().keys(inp);
	}

	if(type === 'function'){
		const col = findCollectionForContainer(inp);
		return col ? col.schema : toJoi(inp);
	}

	return toJoi(inp);
}