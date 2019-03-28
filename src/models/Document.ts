// import {validate} from 'class-validator';

export class Document {
	constructor(
		public _key: string,
		public _id: string,
		public _rev: string
	) {}
	
	// async validate(){
	// 	// let errors = await validate(this);
	// }

	static get(){
		console.log('test');}
}