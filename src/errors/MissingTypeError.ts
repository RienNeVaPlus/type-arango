export class MissingTypeError extends Error {
  constructor(name: string, what: string) {
    super(`Missing type of ${what} in ${name}`);

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
