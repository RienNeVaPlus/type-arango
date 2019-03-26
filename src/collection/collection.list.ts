import {Collection} from "./collection";

class CollectionList {
	col: Collection[] = [];

	add(constructor: Collection){
		let col = new Collection(constructor);
		this.col.push(col);
		return col;
	}

	find(constructor: any): Collection | undefined {
		return this.col.find(col => col.constructor === constructor);
	}

	get(constructor: any): Collection {
		let col = this.find(constructor);
		if(col) return col;
		return this.add(constructor);
	}
}

export const collectionList = new CollectionList;