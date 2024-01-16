import { Caller } from '../Models/Caller';
import phoneNumberCheck from './phoneNumberCheck';

export default async function checkCredential(phone: string, area: string, pin: string) {
	if (!phone || !pin) return false;
	if (!phoneNumberCheck(phone)) return false;
	if (pin.length != 4) return false;

	const caller = await Caller.findOne({ phone: phone, area: area });
	if (!caller) return false;
	if (caller.pinCode != pin) return false;
	return caller;
}
