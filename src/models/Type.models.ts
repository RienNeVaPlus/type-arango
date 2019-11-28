import {config} from '..'
import * as Joi from 'joi'

export namespace Type {
	export class I18n<T = any> {
		[key: string]: string | any | T

		static _typeArango: string = '0.4';
		static schema: Joi.ObjectSchema = Joi.object().unknown().example({en:'Translation'});

		static forClient(val: any, {req,session}: any){
			const sess = session();
			const param = req.param('locale');
			if(param === '*') return val;
			const locale = param || (sess.data ? sess.data.locale : config.defaultLocale);
			return val[locale] || val[locale.split('-')[0]] || val[config.defaultLocale] || null;
		}
	}

	/**
	 * Sets current Date to attribute when a new document is inserted
	 */
	export class DateInsert {
		static _typeArango: string = '0.7';
		static schema: Joi.DateSchema = Joi.date();

		static beforeInsert(){ return new Date() }
	}

	/**
	 * Sets current Date to attribute whenever the document is updated
	 */
	export class DateUpdate {
		static _typeArango: string = '0.7';
		static schema: Joi.DateSchema = Joi.date();

		static beforeUpdate(){ return new Date() }
	}
}