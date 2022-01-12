import {Collection, Entities, Route, RouteArg} from '../../../../src' // type-arango
import {Book} from '../../shared'

@Collection({
  of: Book,
  relations: ['author'], // can be `true` to expose all relations
  routes: ['LIST']
})
export class Books extends Entities {
  /**
   * Creates a new book
   */
  @Route.POST($ => ({
    ...$(Book)
  }))
  static CREATE({param,error}: RouteArg){
    const { title } = param

    const bookWithSameTitle = Books.findOne({filter:{title}})
    if(bookWithSameTitle)
      return error('bad request', 'Title is used by '+bookWithSameTitle.related('author').name)

    return new Book({
      title,
      author: 1 // ie. session().uid
    }).save()
  }
}