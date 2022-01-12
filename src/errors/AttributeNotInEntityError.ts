export class AttributeNotInEntityError extends Error {
  constructor(entity: string, name: string | number) {
    super(`The attribute "${name}" has not been defined on the entity ${entity}`)

    Object.setPrototypeOf(this, new.target.prototype)
  }
}
