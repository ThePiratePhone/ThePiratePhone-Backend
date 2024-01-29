import { Caller } from '../Models/Caller';
import phoneNumberCheck from './phoneNumberCheck';

export default async function checkCredentials(phone: string, area: string, pinCode: string) {
	if (!phone || !pinCode) return false;
	if (phone.startsWith('0')) {
		phone = phone.replace('0', '+33');
	}
	if (!phoneNumberCheck(phone)) return false;
	if (pinCode.length != 4) return false;

	try {
		const caller = await Caller.findOne({ phone: phone, area: area });
		if (!caller) return false;
		if (caller.pinCode != pinCode) return false;
		return caller;
	} catch {
		return false;
	}
}
