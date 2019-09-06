import {Attribute, Document, Entity, OneToMany, Related} from '../../../src' // type-arango
import {Book} from '.';

// describe the user
@Document()
export class Author extends Entity {
	@Attribute()
	name: string;

	@OneToMany()
	books: Related<Book[]>
}