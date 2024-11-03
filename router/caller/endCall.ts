import { Request, Response } from 'express';

import { Call } from '../../Models/Call';
import { Caller } from '../../Models/Caller';
import { Campaign } from '../../Models/Campaign';
import { Client } from '../../Models/Client';
import { log } from '../../tools/log';
import { checkParameters, checkPinCode, clearPhone, phoneNumberCheck, sanitizeString } from '../../tools/utils';

/**
 * End a call
 * @example
 * body:{
 * 	"phone": string,+
 * 	"pinCode": string  {max 4 number},
 * 	"timeInCall": number,
 * 	"satisfaction": number {-1, 0, 1, 2, 3, 4},
 * 	"comment": string | null,
 * 	"status": Boolean,
 *
 * 	"area": mongoDBID
 * }
 *
 * @throws {400}: Missing parameters
 * @throws {400}: Invalid pin code
 * @throws {400}: Invalid phone number
 * @throws {400}: satisfaction is not a valid number
 * @throws {403}: Invalid credential
 * @throws {403}: No call in progress
 * @throws {400}: Invalid campaign in call
 * @throws {500}: client deleted error
 * @throws {500}: invalid client in call
 * @throws {200}: Call ended
 */
export default async function endCall(req: Request<any>, res: Response<any>) {
	const ip = req.hostname;
	if (
		!checkParameters(
			req.body,
			res,
			[
				['phone', 'string'],
				['pinCode', 'string'],
				['timeInCall', 'number'],
				['satisfaction', 'string'],
				['status', 'boolean'],
				['area', 'ObjectId'],
				['comment', 'string', true]
			],
			__filename
		)
	)
		return;

	if (!checkPinCode(req.body.pinCode, res, __filename)) return;

	const phone = clearPhone(req.body.phone);
	if (!phoneNumberCheck(phone)) {
		res.status(400).send({ message: 'Invalid phone number', OK: false });
		log(`Invalid phone number from: ${ip}`, 'WARNING', __filename);
		return;
	}

	req.body.timeInCall = Math.min(req.body.timeInCall, 1_200_000);

	const caller = await Caller.findOne(
		{ phone: phone, pinCode: { $eq: req.body.pinCode }, area: { $eq: req.body.area } },
		['name']
	);
	if (!caller) {
		res.status(403).send({ message: 'Invalid credential', OK: false });
		log(`Invalid credential from: ${phone} (${ip})`, 'WARNING', __filename);
		return;
	}

	const call = await Call.findOne({ caller: caller._id, satisfaction: 'In progress' }, [
		'status',
		'satisfaction',
		'duration',
		'comment',
		'lastInteraction',
		'campaign',
		'client'
	]);

	if (!call) {
		res.status(403).send({ message: 'No call in progress', OK: false });
		log(`No call in progress from: ${phone} (${ip})`, 'WARNING', __filename);
		return;
	}

	const campaign = await Campaign.findById(call?.campaign);
	if (!campaign) {
		res.status(500).send({ message: 'Invalid campaign in call', OK: false });
		log(`invalid campaing in call ${call?.id} from: ${ip}`, 'ERROR', __filename);
		return;
	}
	if (!campaign.status.includes(req.body.satisfaction)) {
		res.status(400).send({ message: 'satisfaction is not in campaign', data: campaign.status, OK: false });
		log(`satisfaction is not in campaign from: ${ip}`, 'WARNING', __filename);
		return;
	}

	call.satisfaction = sanitizeString(req.body.satisfaction);
	call.duration = req.body.timeInCall ?? 0;
	if (req.body.comment) call.comment = sanitizeString(req.body.comment);
	call.lastInteraction = new Date();
	call.status = req.body.status;

	try {
		await call.save();
		res.status(200).send({ message: 'Call ended', OK: true });
		log(`Call ended by ${caller.name} (${phone})`, 'INFO', __filename);
	} catch (e) {
		res.status(500).send({ message: 'Internal error', OK: false });
		log(`Internal error: ${e} from: ${caller.name} (${phone}) ${ip}`, 'ERROR', __filename);
	}
}
