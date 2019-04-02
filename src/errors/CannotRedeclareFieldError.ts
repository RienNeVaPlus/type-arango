export class CannotRedeclareFieldError extends Error {
	constructor(field: string, entity: string) {
		super('Cannot redeclare field "'+field+'" of '+entity+' entity.');

		Object.setPrototypeOf(this, new.target.prototype);
	}
}