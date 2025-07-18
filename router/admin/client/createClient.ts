import { Request, Response } from 'express';

import { Area } from '../../../Models/Area';
import { Campaign } from '../../../Models/Campaign';
import { Client } from '../../../Models/Client';
import { log } from '../../../tools/log';
import { checkParameters, clearPhone, hashPasword, phoneNumberCheck, sanitizeString } from '../../../tools/utils';

/**
 * create a client
 * if this client is updated, the updateKey value is reqired
 *
 * @example
 * body:{
 * 	phone: string,
 * 	name: string,
 * 	adminCode: string,
 * 	pinCode: string,
 * 	area: ObjectId,
 *	"allreadyHased": boolean
 * 	firstName?: string,
 * 	institution?: string,
 * 	updateIfExist?: boolean,
 * 	updateKey: ObjectId
 * }
 *
 * @throws {400} if missing parameters
 * @throws {400} bad hash for admin code
 * @throws {400} if wrong phone number
 * @throws {400} if wrong pin code
 * @throws {401} if wrong admin code
 * @throws {401} if user already exist
 * @throws {500} if internal server error
 * @throws {200} if OK
 */
export default async function createClient(req: Request<any>, res: Response<any>) {
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
				['name', 'string'],
				['firstName', 'string', true],
				['institution', 'string', true],
				['adminCode', 'string'],
				['area', 'ObjectId'],
				['allreadyHaseded', 'boolean', true],
				['updateIfExist', 'boolean', true],
				['updateKey', 'ObjectId', true]
			],
			__filename
		)
	)
		return;
	const password = hashPasword(req.body.adminCode, req.body.allreadyHaseded, res);
	if (!password) return;

	if (
		!req.body.priority ||
		!Array.isArray(req.body.priority) ||
		req.body.priority.every(
			(e: any) =>
				!e.campaign || !e.id || typeof e.campaign !== 'string' || typeof e.id !== 'string' || e.id.length != 8
		)
	) {
		res.status(400).send({
			message: 'Invalid priority, priority must be a array<{ campaign: objectId, id: string(lenght=8) }>',
			OK: false
		});
		log(`[!${req.body.area}, ${ip}] Invalid priority`, 'WARNING', __filename);
		return;
	}

	const area = await Area.findOne({ adminPassword: { $eq: password }, _id: { $eq: req.body.area } });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`[!${req.body.area}, ${ip}] Wrong admin code`, 'WARNING', __filename);
		return;
	}

	const phone = clearPhone(req.body.phone);
	if (!phoneNumberCheck(phone)) {
		res.status(400).send({ message: 'Wrong phone number', OK: false });
		log(`[${req.body.area}, ${ip}] Wrong phone number`, 'WARNING', __filename);
		return;
	}

	const exist = (await Client.findOne({ phone: phone })) != null;
	if (!req.body.updateIfExist && exist) {
		res.status(401).send({ message: 'User already exist', OK: false });
		log(`[${req.body.area}, ${ip}] User already exist`, 'WARNING', __filename);
		return;
	}

	const campaign = await Campaign.findOne({ area: { $eq: area._id }, active: true }, []);
	if (!campaign) {
		res.status(404).send({ message: 'no campaign in progress', OK: false });
		log(`[${req.body.area}, ${ip}] no campaign in progress`, 'WARNING', __filename);
		return;
	}

	let client: InstanceType<typeof Client>;
	if (exist) {
		const client = await Client.updateOne(
			{ _id: req.body.updateKey },
			{
				name: sanitizeString(req.body.name),
				phone: phone,
				firstName: sanitizeString(req.body.firstName ?? ''),
				institution: sanitizeString(req.body.institution ?? ''),
				area: area._id,
				campaigns: [campaign._id],
				priority: req.body.priority
			}
		);
		if (client.modifiedCount === 0) {
			res.status(404).send({ message: 'Client not found', OK: false });
			log(`[${req.body.area}, ${ip}] Client not found`, 'WARNING', __filename);
			return;
		} else {
			res.status(200).send({ message: 'Client updated', OK: true });
			log(`[${req.body.area}, ${ip}] Client updated`, 'INFO', __filename);
			return;
		}
	} else {
		client = new Client({
			name: sanitizeString(req.body.name),
			phone: phone,
			firstName: sanitizeString(req.body.firstName ?? ''),
			institution: sanitizeString(req.body.institution ?? ''),
			area: area._id,
			campaigns: [campaign._id],
			sortGroup: req.body.priority
		});
	}

	try {
		await client.save();
		res.status(200).send({ message: 'client ' + client.name + ' created', OK: true });
		log(`[${req.body.area}, ${ip}] client ${client.name} created`, 'INFO', __filename);
	} catch (error: any) {
		res.status(500).send({ message: 'Internal server error', OK: false });
		log(`[${req.body.area}, ${ip}] Internal server error: ${error.message}`, 'ERROR', __filename);
	}
}
