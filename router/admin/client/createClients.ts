import { Request, Response } from 'express';

import { Area } from '../../../Models/Area';
import { Campaign } from '../../../Models/Campaign';
import { Client } from '../../../Models/Client';
import { log } from '../../../tools/log';
import { checkParameters, clearPhone, hashPasword, phoneNumberCheck, sanitizeString } from '../../../tools/utils';

/**
 * create clients, max size 500
 * @example
 * body:{
 * 	"adminCode": string,
 * 	"area": string,
 * 	"data": [phone, name, firstname, institution],
 * 	"allreadyHaseded": boolean
 * }
 * @throws {400}: missing parameters,
 * @throws {400}: new password is not a hash
 * @throws {400}: to manu users (more of 500)
 * @throws {403}: bad area or adminCode
 * @throws {404}: no campaing in progress
 * @throws {200}: all fine
 */
export default async function createClients(req: Request<any>, res: Response<any>) {
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
				['area', 'ObjectId'],
				['allreadyHaseded', 'boolean', true]
			],
			ip
		)
	)
		return;
	if (!Array.isArray(req.body['data'])) {
		res.status(400).send({ message: 'data must be an array', OK: false });
		log(`[!${req.body.area}, ${ip}] data must be an array`, 'WARNING', __filename);
		return;
	}

	if (req.body.data.length > 500) {
		res.status(400).send({ message: 'Too many users', OK: false });
		log(`[!${req.body.area}, ${ip}] Too many users`, 'WARNING', __filename);
		return;
	}

	const password = hashPasword(req.body.adminCode, req.body.allreadyHaseded, res);
	if (!password) return;

	const area = await Area.findOne(
		{
			_id: { $eq: req.body.area },
			adminPassword: { $eq: password }
		},
		['name']
	);
	if (!area) {
		res.status(403).send({ message: 'area not found or bad admin password', OK: false });
		log(`[!${req.body.area}, ${ip}] area not found or bad admin password`, 'WARNING', __filename);
		return;
	}

	const campaign = await Campaign.findOne({ area: { $eq: area._id }, active: true }, []);
	if (!campaign) {
		res.status(404).send({ message: 'no campaign in progress', OK: false });
		log(`[${req.body.area}, ${ip}] no campaign in progress`, 'WARNING', __filename);
		return;
	}

	const errors: Array<[string | undefined, string | undefined, string]> = [];
	//format: [phone, name, firstname, institution]
	const sleep: Array<Promise<boolean>> = req.body.data.map(
		async (usr: [string | undefined, string | undefined, string | undefined, string | undefined]) => {
			const phone = clearPhone(usr[0] ?? '');
			try {
				if (!phoneNumberCheck(phone)) {
					errors.push([usr[1] + ' ' + usr[2], usr[0], 'Wrong phone number']);
					return false;
				}
				if ((await Client.countDocuments({ phone: phone })) == 0) {
					const user = new Client({
						name: sanitizeString(usr[1] ?? ''),
						firstname: sanitizeString(usr[2] ?? ''),
						phone: phone,
						campaigns: [campaign._id]
					});
					// create it
					await user.save();
					return true;
				} else if ((await Client.countDocuments({ phone: phone, campaigns: { $ne: campaign._id } })) == 1) {
					// client exist in another campaing
					await Client.updateOne(
						{ phone: phone, name: sanitizeString(usr[1] ?? ''), firstname: sanitizeString(usr[2] ?? '') },
						{ $push: { campaigns: campaign._id } }
					);
				} else {
					// duplicate
					throw { code: 11000 };
				}
			} catch (error: any) {
				if (error.code != 11000) {
					errors.push([usr[0], phone, error.message]);
				}
			}
		}
	);
	await Promise.all(sleep);
	log(`[${req.body.area}, ${ip}] Created ${req.body.data.length - errors.length} users`, 'INFO', __filename);
	res.status(200).send({ message: 'OK', OK: true, errors: errors });
}
