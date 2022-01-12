export class RelationNotFoundError extends Error {
  constructor(type: 'OneToOne' | 'OneToMany' | 'ManyToOne' | 'ManyToMany', entity: string, relation: any) {
    super(`The @${type} relation of ${entity} to ${relation} could not be established.`)

    Object.setPrototypeOf(this, new.target.prototype)
  }
}
