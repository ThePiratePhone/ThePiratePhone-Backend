import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { log } from '../../../tools/log';
import { Area } from '../../../Models/Area';
import { Caller } from '../../../Models/Caller';
import { clearPhone, phoneNumberCheck } from '../../../tools/utils';

/**
 * change caller name
 *
 * @example
 * body:
 * {
 * 	"adminCode": string,
 * 	"phone": string,
 * 	"newName": string,
 * 	"area": string
 * }
 *
 * @throws {400}: Missing parameters
 * @throws {400}: Wrong phone number
 * @throws {401}: Wrong admin code
 * @throws {400}: Caller not found
 * @throws {200}: OK
 */
export default async function ChangeName(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();

	if (
		!req.body ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area) ||
		typeof req.body.phone != 'string' ||
		typeof req.body.newName != 'string'
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', __filename);
		return;
	}

	const phone = clearPhone(req.body.phone);
	if (!phoneNumberCheck(phone)) {
		res.status(400).send({ message: 'Wrong phone number', OK: false });
		log('Wrong phone number from ' + ip, 'WARNING', __filename);
		return;
	}
	req.body.newName = req.body.newName.trim();
	if (req.body.newName == '') {
		res.status(400).send({ message: 'Wrong newName number', OK: false });
		log('Wrong newName number from ' + ip, 'WARNING', __filename);
		return;
	}

	const area = await Area.findOne({ AdminPassword: { $eq: req.body.adminCode }, _id: { $eq: req.body.area } });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', __filename);
		return;
	}

	const change = await Caller.updateOne({ phone: phone }, { name: { $eq: req.body.newName } });
	if (change.matchedCount != 1) {
		res.status(400).send({ message: 'Caller not found', OK: false });
		log('Caller not found from ' + ip, 'WARNING', __filename);
		return;
	}

	res.status(200).send({ message: 'Caller name changed', OK: false });
	log('Caller name changed from ' + ip, 'INFORMATION', __filename);
}
