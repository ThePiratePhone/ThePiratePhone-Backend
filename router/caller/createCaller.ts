import { Request, Response } from 'express';

import { Area } from '../../Models/Area';
import { Caller } from '../../Models/Caller';
import { log } from '../../tools/log';
import { checkParameters, checkPinCode, clearPhone, phoneNumberCheck } from '../../tools/utils';

/**
 * create caller, from caller page
 * @example
 * body:{
 * 	"phone": string,
 * 	"pinCode": string  {max 4 number},
 * 	"area": mongoDBID,
 * 	"AreaPassword": string
 * 	"CallerName": string
 * }
 * @throws {400}: missing parameters,
 * @throws {400}: pin code are more of 4 char,
 * @throws {400}: Wrong phone number
 * @throws {400}: Invalid pin code, pin code isn't only number
 * @throws {404}: area not found or invalid password
 * @throws {409}: caller already exist
 * @throws {500}: Error while saving caller
 * @throws {200}: all fine
 */
export default async function createCaller(req: Request<any>, res: Response<any>) {
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
				['area', 'ObjectId'],
				['AreaPassword', 'string'],
				['CallerName', 'string']
			],
			__filename
		)
	) {
		return;
	}

	if (!checkPinCode(req.body.pinCode, res, __filename)) return;

	const phone = clearPhone(req.body.phone);

	if (!phoneNumberCheck(phone)) {
		res.status(400).send({ message: 'Wrong phone number', OK: false });
		log(`[!${req.body.phone}, ${ip}] Wrong phone number`, 'WARNING', __filename);
		return;
	}

	const area = await Area.findOne({ _id: { $eq: req.body.area }, password: { $eq: req.body.AreaPassword } }, [
		'name'
	]);
	if (!area) {
		res.status(404).send({ message: 'area not found or invalid password', OK: false });
		log(`[!${req.body.phone}, ${ip}] area not found or invalid password`, 'WARNING', __filename);
		return;
	}

	if ((await Caller.countDocuments({ phone: phone })) != 0) {
		res.status(409).send({ message: 'caller already exist', OK: false });
		log(`[${req.body.phone}, ${ip}] caller already exist in ${area.name}`, 'WARNING', 'createCaller.ts');
		return;
	}

	const newCaller = new Caller({
		phone: phone,
		pinCode: req.body.pinCode,
		area: area._id,
		name: req.body.CallerName
	});

	const result = await newCaller.save();
	if (!result) {
		res.status(500).send({ message: 'Internal error', OK: false });
		log(`[${req.body.phone}, ${ip}] Error while saving caller`, 'CRITICAL', 'createCaller.ts');
		return;
	}

	res.status(200).send({ message: 'Caller created', OK: true });
	log(`[${req.body.phone}, ${ip}] Caller ${newCaller.name} created`, 'INFO', 'createCaller.ts');
}
