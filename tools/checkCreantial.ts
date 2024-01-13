import { Caller } from '../Models/Caller';

export default async function checkCredential(phone: string, pin: string) {
	if (!phone || !pin) return false;

	const caller = await Caller.findOne({ phone: phone });
	if (!caller) return false;
	if (caller.pinCode != pin) return false;
	return caller;
}
