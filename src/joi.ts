import * as oJoi from 'joi'
import {Rules} from 'joi';

// can't import them because of rc
const OPERATORS = ['==', '!=', '<', '<=', '>', '>=', 'IN', 'NOT IN', 'LIKE', '=~', '!~'];

interface ExtendedNumberSchema extends oJoi.NumberSchema {
	round(): this;
	dividable(num: number): this;
}

interface ExtendedStringSchema extends oJoi.StringSchema {
	operator(): this;
}

interface ExtendedJoi extends oJoi.Root {
	number(): ExtendedNumberSchema;
	string(): ExtendedStringSchema;
}

const joiOperators = oJoi.string().valid(OPERATORS);

const operator: Rules = {
		name: 'operator',
		params: {
			allow: oJoi.alternatives([joiOperators.required(), oJoi.array().items(joiOperators)])
		},
		setup(this: any, {allow}: any) {
			const sep = require('./index').config.paramOperatorSeparator;
			allow = typeof allow === 'string' ? [allow] : allow || OPERATORS;
			this._flags.operators = allow;
			this._flags.regexp = new RegExp('^('+OPERATORS.join('|')+'){1}[\\'+sep+'|'+encodeURI(sep).split('').join('\\')+']{1}(.*)$');
		},
		validate(this: any, _param, value, state, options){
			const match = value.match(this._flags.regexp);

			if(match && !this._flags.operators.includes(match[1])){
				return this.createError('string.operator', {i:match[1],o:this._flags.operators}, state, options);
			}

			return [match ? match[1] : '==', match ? match[2] : value];
		}
	};

const Joi: ExtendedJoi = oJoi
	.extend({
		name: 'string',
		base: oJoi.string(),
		language: {operator: 'operator "{{i}}" must be one of {{o}}'},
		rules: [operator]
	});

export {Joi}