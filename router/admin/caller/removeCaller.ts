import { Request, Response } from 'express';
import { Area } from '../../../Models/Area';
import { Call } from '../../../Models/Call';
import { Caller } from '../../../Models/Caller';
import { log } from '../../../tools/log';
import { checkParameters, clearPhone, hashPasword, phoneNumberCheck } from '../../../tools/utils';

/**
 * Remove a caller
 *
 * @example
 * body:{
 * 	"adminCode": string,
 * 	"phone": string,
 * 	"area": string
 * }
 *
 * @throws {400}: Missing parameters
 * @throws {400}: adminCode is not a hash
 * @throws {400}: Wrong phone number
 * @throws {400}: Invalid area
 * @throws {400}: Caller not found
 * @throws {500}: Error while removing caller
 * @throws {200}: Caller removed
 */
export default async function removeCaller(req: Request<any>, res: Response<any>) {
	const ip =
		(Array.isArray(req.headers['x-forwarded-for'])
			? req.headers['x-forwarded-for'][0]
			: req.headers['x-forwarded-for']?.split(',')?.[0] ?? req.ip) ?? 'no IP';

	if (
		!checkParameters(
			req.body,
			res,
			[
				['adminCode', 'string'],
				['phone', 'string'],
				['area', 'ObjectId'],
				['allreadyHaseded', 'boolean', true]
			],
			__filename
		)
	)
		return;

	const phone = clearPhone(req.body.phone);

	if (!phoneNumberCheck(phone)) {
		res.status(400).send({ message: 'Wrong phone number', OK: false });
		log('Wrong phone number', 'WARNING', __filename);
		return;
	}
	const password = hashPasword(req.body.adminCode, req.body.allreadyHaseded, res);
	if (!password) return;
	const area = await Area.findOne({ _id: { $eq: req.body.area }, adminPassword: { $eq: password } });
	if (!area) {
		res.status(400).send({ message: 'Invalid area', OK: false });
		log(`Invalid area from: ${phone} (${ip})`, 'WARNING', __filename);
		return;
	}

	const caller = await Caller.findOne({ phone: phone });
	if (!caller) {
		res.status(400).send({ message: 'Caller not found', OK: false });
		log(`Caller not found from: ${phone} (${ip})`, 'WARNING', __filename);
		return;
	}

	const curentCall = await Call.findOne({ caller: caller._id, satisfaction: 'In progress' }, ['id']);
	if (curentCall) {
		await Call.deleteMany({ caller: caller._id, satisfaction: 'In progress' });
		log(
			`Call removed (for remove user ${caller.name} (${caller.phone})): ${curentCall.id} from ${area.name} (${ip})`,
			'INFO',
			__filename
		);
	}
	const remove = await Caller.deleteOne({ phone: phone });
	if (remove.deletedCount == 1) {
		res.status(200).send({ message: 'Caller removed', OK: true });
		log(`Caller removed: ${phone} from ${area.name} (${ip})`, 'INFO', __filename);
	} else {
		res.status(500).send({ message: 'Error while removing caller', OK: false });
		log(`Error while removing caller: ${phone} from ${area.name} (${ip})`, 'ERROR', __filename);
	}
}
