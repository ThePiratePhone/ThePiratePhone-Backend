import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { Area } from '../../../Models/Area';
import { Call } from '../../../Models/Call';
import { Caller } from '../../../Models/Caller';
import { log } from '../../../tools/log';
import { clearPhone, phoneNumberCheck } from '../../../tools/utils';

/**
 * Remove a caller
 *
 * @exemple
 * body:
 * {
 * 	"adminCode": string,
 * 	"phone": string,
 * 	"area": string
 * }
 *
 * @throws {400}: Missing parameters
 * @throws {400}: Wrong phone number
 * @throws {400}: Invalid area
 * @throws {400}: Caller not found
 * @throws {500}: Error while removing caller
 * @throws {200}: Caller removed
 */
export default async function removeCaller(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.adminCode != 'string' ||
		typeof req.body.phone != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', 'removeCaller.ts');
		return;
	}

	req.body.phone = clearPhone(req.body.phone);

	if (!phoneNumberCheck(req.body.phone)) {
		res.status(400).send({ message: 'Wrong phone number', OK: false });
		log('Wrong phone number', 'WARNING', 'removeCaller.ts');
		return;
	}

	const area = await Area.findOne({ _id: req.body.area, AdminPassword: req.body.adminCode });
	if (!area) {
		res.status(400).send({ message: 'Invalid area', OK: false });
		log(`Invalid area from: ${req.body.phone} (${ip})`, 'WARNING', 'removeCaller.ts');
		return;
	}

	const caller = await Caller.findOne({ phone: req.body.phone });
	if (!caller) {
		res.status(400).send({ message: 'Caller not found', OK: false });
		log(`Caller not found from: ${req.body.phone} (${ip})`, 'WARNING', 'removeCaller.ts');
		return;
	}

	const curentCall = await Call.findOne({ caller: caller._id, status: 'In progress' }, ['id']);
	if (curentCall) {
		await Call.deleteOne({ caller: caller._id, status: 'In progress' });
		log(
			`Call removed (for remove user ${caller.name} (${caller.phone})): ${curentCall.id} from ${area.name} (${ip})`,
			'INFO',
			'removeCaller.ts'
		);
	}
	const remove = await Caller.deleteOne({ phone: req.body.phone });
	if (remove.deletedCount == 1) {
		res.status(200).send({ message: 'Caller removed', OK: true });
		log(`Caller removed: ${req.body.phone} from ${area.name} (${ip})`, 'INFO', 'removeCaller.ts');
	} else {
		res.status(500).send({ message: 'Error while removing caller', OK: false });
		log(`Error while removing caller: ${req.body.phone} from ${area.name} (${ip})`, 'ERROR', 'removeCaller.ts');
	}
}
