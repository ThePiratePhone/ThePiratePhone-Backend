import { Request, Response } from 'express';

import { Area } from '../../Models/Area';
import { Caller } from '../../Models/Caller';
import { log } from '../../tools/log';
import { checkParameters, checkPinCode, clearPhone, phoneNumberCheck } from '../../tools/utils';

/**
 *allow a caller to join a campaign
 *
 * @example
 * body:
 * {
 * 	"phone": string,
 * 	"pinCode": string  {max 4 number},
 * 	"campaignId": string,
 * 	"campaignPassword": string
 * }
 *
 * @throws {400}: Missing parameters
 * @throws {400}: Invalid phone number
 * @throws {403}: Invalid credential or incorrect campaing
 * @throws {404}: Campaign not found
 * @throws {403}: Already joined campaign
 * @throws {500}: Internal error
 * @throws {200}: Campaign joined
 */
export default async function joinCampaign(req: Request<any>, res: Response<any>) {
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
				['destinationArea', 'ObjectId'],
				['areaPassword', 'string']
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

	const caller = await Caller.findOne({ phone: phone, pinCode: { $eq: req.body.pinCode } }, [
		'name',
		'campaigns',
		'phone',
		'areasJoined'
	]);
	if (!caller) {
		res.status(403).send({ message: 'Invalid credential or incorrect campaing', OK: false });
		log(`[!${req.body.phone}, ${ip}] Invalid credential or incorrect campaing`, 'WARNING', __filename);
		return;
	}

	const area = await Area.findOne({
		_id: { $eq: req.body.destinationArea },
		password: { $eq: req.body.areaPassword }
	});
	if (!area) {
		res.status(404).send({ message: 'new area not found', OK: false });
		log(`[${req.body.phone}, ${ip}] new area not found from`, 'WARNING', __filename);
		return;
	}
	console.log(caller);
	if (caller.areasJoined.includes(area.id)) {
		res.status(403).send({ message: 'Already joined campaign', OK: false });
		log(`[${req.body.phone}, ${ip}] Already joined campaign`, 'WARNING', __filename);
		return;
	}

	try {
		caller.areasJoined.push(area.id);
		await caller.save();
	} catch (e) {
		res.status(500).send({ message: 'Internal error', OK: false });
		log(`[${req.body.phone}, ${ip}] Internal error: ${e}`, 'ERROR', __filename);
		return;
	}

	res.status(200).send({
		message: 'Campaign joined',
		data: {
			areaId: area._id,
			areaName: area.name
		},
		OK: true
	});
	log(`[${req.body.phone}, ${ip}] join area: ${area.name}`, 'INFO', __filename);
}
