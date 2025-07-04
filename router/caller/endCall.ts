import e, { Request, Response } from 'express';

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
 * 	"status": Boolean
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
	const ip =
		(Array.isArray(req.headers['x-forwarded-for'])
			? req.headers['x-forwarded-for'][0]
			: req.headers['x-forwarded-for']?.split(',')?.[0] ?? req.ip) ?? 'no IP';

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
		log(`[!${req.body.phone}, ${ip}] Invalid phone number`, 'WARNING', __filename);
		return;
	}

	req.body.timeInCall = Math.min(req.body.timeInCall, 1_200_000);

	const caller = await Caller.findOne({ phone: phone, pinCode: { $eq: req.body.pinCode } }, ['name']);
	if (!caller) {
		res.status(403).send({ message: 'Invalid credential', OK: false });
		log(`[!${req.body.phone}, ${ip}] Invalid credential`, 'WARNING', __filename);
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
		log(`[${req.body.phone}, ${ip}] No call in progress`, 'WARNING', __filename);
		return;
	}

	const campaign = await Campaign.findById(call?.campaign);
	if (!campaign) {
		res.status(500).send({ message: 'Invalid campaign in call', OK: false });
		log(`[${req.body.phone}, ${ip}] invalid campaing in call ${call?.id}`, 'ERROR', __filename);
		return;
	}

	if (campaign.status.findIndex(e => e.name == req.body.satisfaction) == -1) {
		res.status(400).send({ message: 'satisfaction is not in campaign', data: campaign.status, OK: false });
		log(`[${req.body.phone}, ${ip}] satisfaction is not in campaign`, 'WARNING', __filename);
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
		log(`[${req.body.phone}, ${ip}] Call ended`, 'INFO', __filename);
	} catch (e) {
		res.status(500).send({ message: 'Internal error', OK: false });
		log(`[${req.body.phone}, ${ip}] Internal error: ${e}`, 'ERROR', __filename);
	}
}
