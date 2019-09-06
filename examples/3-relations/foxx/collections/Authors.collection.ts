import {Collection, Entities} from '../../../../src' // type-arango
import {Author} from '../../shared'

@Collection(of => Author, {relations:true})
export class Authors extends Entities {}