import {DocumentData, QueryFilter} from '../types'
import {getDocumentForContainer} from './index';
import {AttributeNotInEntityError, MissingKeyError, SymbolKeysNotSupportedError} from '../errors';
import {db} from '../utils';

const nativeKeys = ['constructor','toString'];
const unenumerable = ['_saveKeys','_collection'];
const globalAttributes = ['_key','_rev','_id','_oldRev'];
const accessibleKeys = globalAttributes.concat('_saveKeys');

interface SaveOptions extends ArangoDB.UpdateOptions, ArangoDB.InsertOptions {
	update: boolean;
}

export class Entity {
	public _collection: ArangoDB.Collection;
	public _saveKeys: string[] = [];

	public _id?: string;
	public _key?: string;
	public _rev?: string;

	static get _doc(){
		return getDocumentForContainer(this);
	}

	static get _db(){
		return db;
	}

	get _doc(){
		return (this.constructor as typeof Entity)._doc;
	}

	constructor(doc?: DocumentData | string, docIsSync: boolean = false) {
		if(typeof doc === 'string')
			doc = {_key:doc};

		if(doc){
			if(!docIsSync) this._saveKeys = Object.keys(doc).filter(k => (this as any)[k] !== (doc as DocumentData)[k]);
			this.merge(doc);
		}

		const { _doc } = this;
		const constructor = (this.constructor as typeof Entity);
		const attribute = _doc.attribute;
		const keys = Object.keys(attribute).concat(accessibleKeys);
		this._collection = _doc.col!.db;

		// hide some attrs
		unenumerable.forEach(attr => Object.defineProperty(this, attr, {enumerable:false}));

		// setup proxy
		return new Proxy(this, {
			get(target: any, key: string){
				if(nativeKeys.includes(key)) return target[key];

				const cleanKey = key.startsWith('_') ? key.substr(1) : key;

				// return relation values as entity._attribute
				if(key.startsWith('_') && _doc.relation[cleanKey]){
					return target[cleanKey];
				}

				// support relation entity load via entity.relation()
				const rel = _doc.relation[key];
				if(rel && !(target[key] instanceof Entity)){
					let filter: QueryFilter = {[rel.attribute]:target._key};
					if(target[key]) filter = {_key:target[key]};
					return _doc.resolveRelation.bind(_doc, rel, filter, target[key]);
				}

				return target[key];
			},
			set(target: any, key: string, val: any){
				if(typeof key === 'symbol')
					throw new SymbolKeysNotSupportedError();

				if(_doc.relation[key]){
					// if(val instanceof Entity) val.save().then();
				}
				// check key
				else if(!keys.includes(String(key))) {
					throw new AttributeNotInEntityError(constructor.name, key);
				}
				// joi validation
				else if(attribute[key]){
					const {error, value} = attribute[key].schema!.validate(val);
					if(error) throw error;
					val = value;
				}

				if(target[key] === val) return true;

				// set
				target._saveKeys.push(key);
				target[key] = val;
				return true;
			}
		})
	}

	/**
	 * Creates the document by using .save({update:false});
	 */
	create(){
		return this.save({update:false});
	}

	/**
	 * Merges `obj` into `this`
	 */
	merge(obj: DocumentData){
		return Object.assign(this, obj);
	}

	/**
	 * Saves changed attributes to database. Creates a new document when no _key is available.
	 * Use the option {update:false} to always create a new document even when a _key is provided.
	 */
	save(options: Partial<SaveOptions> = {}){
		const { _saveKeys, _key, _doc, _collection } = this;

		if(options.update === undefined) options.update = true;

		if(!_saveKeys.length)
			return this;

		// accumulate changed values from _saveKeys into object
		const data = _saveKeys.reduce((o: any, key: string) => {
			const v = (this as any)[key];

			// replace relation functions with values
			const relation = _doc.relation[key];
			if(relation){
				if(v instanceof Entity && v._saveKeys.length){
					v.save();
				}

				// assign relation id when current entity is not inside relation entity
				if(!v[_doc.name.toLowerCase()]){
					o[key] = v._key;
				}
			}
			// replace entities with their _key
			else if(v instanceof Entity){
				o[key] = v._key;
			}
			else
				o[key] = v;

			return o;
		}, {});
		let res;

		// insert / update
		if(options.update && _key)
			res = _collection.update({_key}, data, options);
		else
			res = _collection.insert(data, options);

		this.merge(res);

		// reset
		this._saveKeys = [];

		return this;
	}

	/**
	 * Replaces the document with the provided doc, ignoring _saveKeys
	 */
	replace(doc: DocumentData, options?: ArangoDB.ReplaceOptions){
		const { _key, _collection } = this;

		if(!_key)
			throw new MissingKeyError(this.constructor.name);

		return this.merge(_collection.replace({_key}, doc, options));
	}

	/**
	 * Removes the document
	 */
	remove(options?: ArangoDB.RemoveOptions){
		const { _key, _collection } = this;

		if(!_key)
			throw new MissingKeyError(this.constructor.name);

		return this.merge(_collection.remove({_key}, options));
	}
}