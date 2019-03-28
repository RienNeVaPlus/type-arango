// import {validate} from 'class-validator';

export class Document {
	constructor(
		public _key: string,
		public _id: string,
		public _rev: string
	) {}
}