export class CannotRedeclareAttributeError extends Error {
  constructor(attribute: string, entity: string) {
    super('Cannot redeclare attribute "'+attribute+'" of '+entity+' entity.')

    Object.setPrototypeOf(this, new.target.prototype)
  }
}