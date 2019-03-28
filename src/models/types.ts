export type MetadataId = 'field' | 'authorized' | 'index';
export type MetadataTypes = FieldMetadata | AuthorizedMetadata | IndexMetadata;

export type RolesFunc = (returns?: void) => Roles;
export type Roles = string[];

export interface Metadata<T> {
	id: MetadataId,
	field: string;
	data: T
}

export interface AuthorizedRoles {
	readers: Roles;
	writers: Roles;
}

export interface AuthorizedMetadata {
	authorized: AuthorizedRoles;
}

export interface IndexMetadata extends ArangoDB.IndexDescription<any> {}


export interface FieldMetadata {
	type: any;
	metadata: any;
	authorized?: AuthorizedRoles;
}

export interface SchemaValue extends FieldMetadata {
	field: string
}

export interface Schema {
	[key: string]: SchemaValue;
}
