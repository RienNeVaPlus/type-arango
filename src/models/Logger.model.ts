import {config} from '../index';
const prefix = 'TypeArango: ';

const a = (arg: any[]) => { arg[0] = prefix + arg[0]; return arg; };

export class Logger {
	error(...arg: any){
		return config.logLevel && console.error(...a(arg));
	}
	warn(...arg: any){
		return config.logLevel > 1 && console.warn(...a(arg));
	}
	info(...arg: any){
		return config.logLevel > 2 && console.info(...a(arg));
	}
	debug(...arg: any){
		return config.logLevel > 3 && console.log(...a(arg));
	}
}