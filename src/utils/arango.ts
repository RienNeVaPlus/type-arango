import {isFoxx} from '../utils'
import {QueryOpt} from '../types'

const is = isFoxx();
export const arango = is ? require('@arangodb') : null;
export const db = is ? arango.db : null;
export const aql = is ? arango.aql : null;

function escape(val: any){
	switch(typeof val){
		case 'string': return '"'+val+'"';
		case 'number': return val;
		default: throw {message:'INVALID_ESCAPING',val};
	}
}

export function queryBuilder(collection: string, {filter,sort,limit,keep,unset}: QueryOpt){
	let q = ['FOR i IN '+collection];
	if(filter){
		Object.entries(filter).forEach(
			([key, value]) => q.push(
				Array.isArray(value) && (String(value[0]).toUpperCase()) === 'IN'
					? 'FILTER '+escape(value[1])+' IN i.'+key
					: 'FILTER i.'+key+' '+(Array.isArray(value) ? value[0]+' '+escape(value[1]) : '== '+escape(value))
			)
		);
	}

	if(sort){
		q.push('SORT i.'+(Array.isArray(sort) ? sort.map(s => s.includes(' ') ? s : s + ' ASC').join(', i.') : sort))
	}

	if(limit){
		q.push('LIMIT '+(Array.isArray(limit) ? limit.join(',') : limit));
	}

	if(keep){
		q.push('RETURN KEEP(i, "'+keep.join('","')+'")');
	} else if(unset){
		q.push('RETURN UNSET(i, "'+unset.join('","')+'")');
	}
	else {
		q.push('RETURN i');
	}

	// logger.warn('Query %o', q);

	return q.join('\n');
}
