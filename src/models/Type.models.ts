import {config} from "../index";
import * as Joi from 'joi'

export namespace Type {
	export class I18n {
		[key: string]: string | any

		static _typeArango: string = '0.4';

		static schema: Joi.ObjectSchema = Joi.object().unknown().example({en:'Translation'});

		static forClient(val: any, {req,session}: any){
			const sess = session();
			const param = req.param('locale');
			if(param === '*') return val;
			const locale = param || (sess.data ? sess.data.locale : config.defaultLocale);
			return val[locale] || val[locale.substr(0,2)] || val[config.defaultLocale] || null;
		}
	}
}