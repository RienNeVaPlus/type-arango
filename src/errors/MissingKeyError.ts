export class MissingKeyError extends Error {
  constructor(name: string) {
    super(`Missing _key attribute on ${name}`);

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
