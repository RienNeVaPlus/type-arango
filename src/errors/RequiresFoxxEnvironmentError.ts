export class RequiresFoxxEnvironmentError extends Error {
	constructor(name: string) {
		super('Cannot use '+name+' outside of Foxx.');

		Object.setPrototypeOf(this, new.target.prototype);
	}
}
