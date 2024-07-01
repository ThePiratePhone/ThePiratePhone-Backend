import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { Caller } from '../../../Models/Caller';
import { Campaign } from '../../../Models/Campaign';
import { log } from '../../../tools/log';
import { clearPhone } from '../../../tools/utils';

/**
 * add one caller to a campaign
 *
 * @example
 * body: {
 * 	phone: string,
 * 	adminCode: string,
 * 	area: string,
 * 	campaign: string
 * }
 *
 * @throws {400} if missing parameters
 * @throws {401} if wrong admin code
 * @throws {404} if caller not found
 * @throws {404} if campaign not found
 * @throws {500} if error adding caller to campaign
 * @throws {200} if caller already in campaign
 * @throws {200} if OK
 */
export default async function addCallerCampaign(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		!ObjectId.isValid(req.body.campaign) ||
		typeof req.body.phone != 'string' ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters`, 'WARNING', __filename);
		return;
	}

	const area = await Area.findOne({ AdminPassword: { $eq: req.body.adminCode }, _id: { $eq: req.body.area } }, [
		'name'
	]);
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ` + ip, 'WARNING', __filename);
		return;
	}

	req.body.phone = clearPhone(req.body.phone);

	const caller = await Caller.findOne({ phone: { $eq: req.body.Phone }, area: area._id }, ['campaigns']);
	if (!caller) {
		res.status(404).send({ message: 'Caller not found', OK: false });
		log(`Caller not found from ${area.name} (${ip})`, 'WARNING', __filename);
		return;
	}

	const campaign = await Campaign.findOne({ _id: { $eq: req.body.campaign }, area: area._id }, ['_id']);
	if (!campaign) {
		res.status(404).send({ message: 'Campaign not found', OK: false });
		log(`Campaign not found from ${area.name} (${ip})`, 'WARNING', __filename);
		return;
	}

	if (caller.campaigns.includes(campaign._id)) {
		res.status(200).send({ message: 'Caller already in campaign', OK: true });
		log(`Caller already in campaign from ${area.name} (${ip})`, 'WARNING', __filename);
		return;
	}
	try {
		await caller.updateOne({ $push: { campaigns: campaign._id } });
	} catch (e) {
		res.status(500).send({ message: 'Error adding caller to campaign', OK: false });
		log(`Error adding caller to campaign from ${area.name} (${ip})`, 'ERROR', __filename);
		return;
	}
	res.status(200).send({ message: 'Caller added to campaign', OK: true });
	log(`Caller added to campaign from ${area.name} (${ip})`, 'INFO', __filename);
}
