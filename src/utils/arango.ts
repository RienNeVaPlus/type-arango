import {isFoxx} from '../utils'
import {QueryOpt} from '../types'
import {logger} from '../index'

const is = isFoxx();
const orders = ['ASC','DESC'];
export const arango = is ? require('@arangodb') : null;
export const db = is ? arango.db : null;

export const operators = ['==','!=','<','<=','>','>=','IN','NOT IN','LIKE','=~','!~'];

function escape(val: any){
	if(val === 'true') return true;
	if(val === 'false') return false;
	if(val === 'null') return null;
	if(Array.isArray(val)) return '["'+clean(val).join('","')+'"]';
	switch(typeof val){
		case 'string': return '"'+val+'"';
		case 'number':
		case 'boolean': return val;
		default: throw {message:'INVALID_ESCAPING',val};
	}
}

function clean(val: any): any {
	if(Array.isArray(val)) return val.map(v => clean(v));
	switch(typeof val){
		default:
		case 'number': return val;
		case 'string':
			const indexOf = val.indexOf(' ');
			return (indexOf > -1 ? val.substr(0, indexOf) : val).replace(/[^a-zA-Z0-9-_.]/g, '');
	}
}

export function queryBuilder(collection: string, {filter,sort,limit,keep,unset}: QueryOpt){
	let q = ['FOR i IN '+collection];
	if(filter){
		Object.entries(filter).forEach(
			([key, value]) => value !== undefined && q.push(
				'FILTER '+
				(
					// ['HAS', value] => FILTER value IN TO_ARRAY(i.key)
					Array.isArray(value) && value[0] === 'HAS'
					? escape(value[1])+' IN TO_ARRAY(i.'+clean(key)+')'

					// ['!=', value] => FILTER i.key != value
					: Array.isArray(value) && operators.includes(value[0])
					? 'i.' + clean(key) + ' ' + value[0] + ' ' + escape(value[1])

					// ['value1','value2'] => FILTER i.key IN [...values]
					: Array.isArray(value)
					? 'i.' + clean(key) + ' IN ' + escape(value)

					// value => FILTER i.key == value
					: 'i.' + clean(key) + ' == ' + escape(value)
				)
			)
		);
	}

	if(sort){
		q.push('SORT i.'+(Array.isArray(sort) ? sort.map(s => {
			if(s.includes(' ')){
				let [a,o] = s.split(' ');
				if(!orders.includes(o.toUpperCase()))
					o = orders[0];
				return clean(a)+' '+o;
			}
			return clean(s) + ' ' + orders[0];
		}).join(', i.') : clean(sort)))
	}

	if(limit){
		limit = clean(limit);
		q.push('LIMIT '+(Array.isArray(limit) ? limit.join(',') : limit));
	}

	if(keep){
		keep = clean(keep);
		q.push('RETURN KEEP(i, "'+keep!.join('","')+'")');
	} else if(unset){
		unset = clean(unset);
		q.push('RETURN UNSET(i, "'+unset!.join('","')+'")');
	}
	else {
		q.push('RETURN i');
	}

	logger.info('Query %o', q.join(' '));

	return q.join('\n');
}
