import {opt} from "../index";
import {db} from '@arangodb';
import CreateCollectionOptions = ArangoDB.CreateCollectionOptions;
import IndexType = ArangoDB.IndexType;
import IndexDescription = ArangoDB.IndexDescription;

export interface TypeCreateCollectionOptions extends CreateCollectionOptions{
	name?: string;
}

export interface TypeIndexDescription {
	type: IndexType;
	additionalFields?: string[];
	sparse?: boolean;
	unique?: boolean;
	deduplicate?: boolean;
}

export class Collection {
	public name: string;
	private indexes: IndexDescription<string>[] = [];

	static toName(input: string){
		input = input.endsWith('s') || !opt.pluralizeCollectionName ? input : input + 's';
		return opt.prefixCollectionName ? module.context.collectionName(input) : input;
	}

	constructor(public constructor: any){
		this.name = Collection.toName(constructor.name.toLowerCase());
	}

	index(
		field: string,
		{
			type = 'hash',
			additionalFields = [],
			sparse,
			unique,
			deduplicate
		}: TypeIndexDescription
	){
		this.indexes.push({
			fields: [field].concat(additionalFields),
			type, sparse, unique, deduplicate
		});
	}

	complete(opt: TypeCreateCollectionOptions){
		if(opt.name) this.name = opt.name;

		let col = db._collection(this.name);
		if(!db._collection(this.name)){
			col = db._createDocumentCollection(this.name, opt);
		}

		if(this.indexes.length)
			this.indexes.forEach(index => col.ensureIndex(index));
	}
}