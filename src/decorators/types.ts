import {ClassType} from '../interfaces';

export type TypeValue = ClassType | Function | object | symbol;

export interface TypeCreateCollectionOptions extends ArangoDB.CreateCollectionOptions {
	name?: string;
}

export interface IndexOptions {
	type: ArangoDB.IndexType;
	additionalFields?: string[];
	sparse?: boolean;
	unique?: boolean;
	deduplicate?: boolean;
}

export type RouteMethod = 'get' | 'post' | 'patch' | 'put' | 'delete';
