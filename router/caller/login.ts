import { Request, Response } from 'express';
import { log } from '../../tools/log';
import { clearPhone, phoneNumberCheck } from '../../tools/utils';
import { Caller } from '../../Models/Caller';

/**
 * get if your credential is valid
 * @example
 * body:{
 * 	"phone": string,
 * 	"pinCode": string  {max 4 number}
 * }
 *
 * @throws {400}: Missing parameters
 * @throws {400}: Wrong pin code
 * @throws {400}: Invalid phone number
 * @throws {403}: Invalid credential
 * @throws {200}: Logged in
 */
export default async function login(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (!req.body || typeof req.body.phone != 'string' || typeof req.body.pinCode != 'string') {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from: ` + ip, 'WARNING', __filename);
		return;
	}
	if (req.body.pinCode.length != 4) {
		res.status(400).send({ message: 'Wrong pin code', OK: false });
		log(`Wrong pin code from: ` + ip, 'WARNING', __filename);
		return;
	}
	const phone = clearPhone(req.body.phone);
	if (!phoneNumberCheck(phone)) {
		res.status(400).send({ message: 'Invalid phone number', OK: false });
		log(`Invalid phone number`, 'WARNING', __filename);
		return;
	}

	const caller = await Caller.findOne({ phone: phone, pinCode: { $eq: req.body.pinCode } }, ['name']);
	if (!caller) {
		res.status(403).send({ message: 'Invalid credential', OK: false });
		log(`Invalid credential from: ${phone} (${ip})`, 'WARNING', __filename);
		return;
	}
	res.status(200).send({ message: 'Logged in', OK: true });
}
