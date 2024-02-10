import { Caller } from '../Models/Caller';
import clearPhone from './clearPhone';
import phoneNumberCheck from './phoneNumberCheck';

export default async function checkCredentials(phone: string, pinCode: string) {
	if (!phone || !pinCode) return false;
	phone = clearPhone(phone);
	if (!phoneNumberCheck(phone)) return false;
	if (pinCode.length != 4) return false;

	try {
		const caller = await Caller.findOne({ phone: phone });
		if (!caller) return false;
		if (caller.pinCode != pinCode) return false;
		return caller;
	} catch {
		return false;
	}
}
