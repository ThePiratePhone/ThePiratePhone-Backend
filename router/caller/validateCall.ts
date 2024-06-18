import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Call } from '../../Models/Call';
import { Caller } from '../../Models/Caller';
import { log } from '../../tools/log';
import { clearPhone, phoneNumberCheck } from '../../tools/utils';

/**
 * Validate inprogress call
 *
 * @example
 * body:{
 * 	"phone": string,
 * 	"pinCode": string  {max 4 number},
 * 	"area": string,
 * 	"satisfaction": number,
 * 	"comment": string
 * }
 *
 * @throws {400}: Missing parameters
 * @throws {400}: Invalid phone number
 * @throws {400}: Invalid pin code
 * @throws {400}: satisfaction is not a valid number
 * @throws {403}: Invalid credential
 * @throws {403}: No call in progress
 * @throws {500}: Internal error
 * @throws {200}: Call ended
 */
export default async function validateCall(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		!ObjectId.isValid(req.body.area) ||
		typeof req.body.satisfaction != 'number' ||
		(req.body.comment && typeof req.body.comment != 'string')
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from: ` + ip, 'WARNING', __filename);
		return;
	}

	if (req.body.pinCode.length != 4) {
		res.status(400).send({ message: 'Invalid pin code', OK: false });
		log(`Invalid pin code from: ${ip}`, 'WARNING', __filename);
		return;
	}

	const phone = clearPhone(req.body.phone);
	if (!phoneNumberCheck(phone)) {
		res.status(400).send({ message: 'Invalid phone number', OK: false });
		log(`Invalid phone number from:${ip}`, 'WARNING', __filename);
		return;
	}

	if (![-1, 0, 1, 2, 3].includes(req.body.satisfaction)) {
		res.status(400).send({ message: 'satisfaction is not a valid number', OK: false });
		log(`satisfaction is not a valid number from ` + ip, 'WARNING', __filename);
		return;
	}

	const caller = await Caller.findOne(
		{ phone: phone, pinCode: { $eq: req.body.pinCode }, area: { $eq: req.body.area } },
		['name']
	);
	if (!caller) {
		res.status(403).send({ message: 'Invalid credential', OK: false });
		log(`Invalid credential from: ${phone} (${ip})`, 'WARNING', __filename);
		return;
	}

	const call = await Call.findOne({ Caller: caller._id, status: 'In progress' }, [
		'status',
		'satisfaction',
		'duration',
		'comment',
		'lastInteraction'
	]);
	if (!call) {
		res.status(403).send({ message: 'No call in progress', OK: false });
		log(`No call in progress from: ${phone} (${ip})`, 'WARNING', __filename);
		return;
	}

	req.body.timeInCall = Math.min(req.body.timeInCall, 1_200_000);

	call.status = 'Done';
	call.satisfaction = req.body.satisfaction;
	call.duration = req.body.timeInCall ?? 0;
	if (req.body.comment) call.comment = req.body.comment;
	if (req.body.satisfaction == -1) {
		call.status = 'deleted';
	}
	call.lastInteraction = new Date();

	try {
		await call.save();
		res.status(200).send({ message: 'Call ended', OK: true });
		log(`Call ended by ${caller.name} (${phone}) from (${ip})`, 'INFO', __filename);
	} catch (e) {
		res.status(500).send({ message: 'Internal error', OK: false });
		log(`Internal error: ${e} from: ${caller.name} (${ip})`, 'ERROR', __filename);
	}
}
