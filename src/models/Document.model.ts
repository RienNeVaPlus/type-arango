import {DocumentData} from '../types';

/**
 * WIP
 */

export class Document {
	public _collection?: string;
	public _saveKeys: string[] = [];
	public _key?: string;
	public _rev?: string;
	public _id?: string;

	constructor(doc?: DocumentData) {
		if(doc) Object.assign(this, doc);
	}

	save(){}
	remove(){}

	static _joi: any = {};

	static findOne(){}

	static find(){}

	static save(_key: string, _doc: any){}

	static remove(_key: string){}

	static create(_key: string, _doc: any){}

}