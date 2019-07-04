import {Schema} from "joi";
import {toJoi} from "../utils";
import * as Joi from 'joi';

export type ScalarType = 'any' | 'string' | 'number' | 'boolean' | 'enum' | string;

export class Scalar {
	public type: string;
	public name?: string;
	public joi: Schema;
	public isRequired: boolean;
	public isArray: boolean;

	constructor(
		type: ScalarType = 'any',
		name?: string
	){
		if(type.includes('=')){
			let parts = type.split('=');
			name = parts[0];
			type = parts[1];
		} else if(!name){
			name = type;
			type = 'string';
		}

		let isRequired = type.includes('!') || (name && name.includes('!')) ? true
			: type.includes('?') || (name && name.includes('?')) ? false : false;
		if(isRequired){
			type = type.replace(/[!?]/g, '');
			name = name ? name.replace(/[!?]/g, '') : undefined;
		}
		let isArray = type.endsWith('[]');
		if(isArray)
			type = type.substr(0, type.length-2);

		let joi = isArray ? Joi.array().items(toJoi(type)) : toJoi(type);
		if(isRequired)
			joi = joi.required();

		this.name = name;
		this.type = type;
		this.joi = joi;
		this.isArray = isArray;
		this.isRequired = isRequired;
	}

	toString() { return this.type + (this.isArray ? '[]' : '') }

	get query() {
		return (this.name ? this.name + (this.isArray ? '[]' : '') + '=' : '')+this.example;
	}

	get path(){
		return '/'+this.example;
	}

	get example(): any {
		return Scalar.example(this.type);
	}

	get requiredIcon(){
		return Scalar.iconRequired(this.isRequired);
	}

	static iconRequired(isRequired: boolean): string {
		return isRequired ? '⚫' : '⚪';
	}

	static example(type: ScalarType): any {
		switch(type){
			default:
			case 'string': return 'string';
			case 'number': return 0;
			case 'boolean': return true;
		}
	}
}