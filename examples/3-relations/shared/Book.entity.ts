import {Attribute, Document, Entity, OneToOne, Related} from '../../../src' // type-arango
import {Author} from '.'

// describe the user
@Document()
export class Book extends Entity {
  @Attribute()
  title: string

  @Attribute()
  @OneToOne(type => Author)
  author: Related<Author>
}