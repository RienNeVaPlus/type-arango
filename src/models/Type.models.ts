export namespace Type {
	export class I18n {
		[key: string]: string;

		static _typeArango: string = '0.4';
		static forClient(val: any, {req,session}: any){
			const locale = req.param('locale') || session().data.locale || 'en';
			return val[locale] || val[locale.substr(0,2)] || null;
		}
	}
}
