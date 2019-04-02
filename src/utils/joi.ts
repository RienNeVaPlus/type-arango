import {Schema} from 'joi';
import * as Joi from 'joi'

export function toJoi(type: any, isArray: boolean = false): Schema {
	if(isArray){
		return Joi.array().items(toJoi(type));
	}

	let j;
	switch(type){
		default:
		case 'string':
		case String: j = Joi.string(); break;
		case 'number':
		case Number: j = Joi.number(); break;
		case 'boolean':
		case Boolean: j = Joi.boolean(); break;

		case 'email': j = Joi.string().email(); break;
		// default:
		// 	console.warn('MISC typeToJoi', type); break;
	}
	return j;
}