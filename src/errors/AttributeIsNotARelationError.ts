export class AttributeIsNotARelationError extends Error {
  constructor(entity: string, attribute: string) {
    super(`The attribute ${entity}.${attribute} is not a relation. Add either a @OneToOne or a @OneToMany decorator to the property of the entity.`);

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
