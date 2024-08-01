import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { Campaign } from '../../../Models/Campaign';
import { log } from '../../../tools/log';

/**
 * Create a campaign
 * @example
 * body:{
 * 	"name": string,
 * 	"script": string,
 * 	"adminCode": string,
 * 	"password": string,
 * 	"callHoursStart": number,
 * 	"callHoursEnd": number,
 * 	"satisfactions": string[],
 * 	"area": mongoDBID
 * }
 *
 * @throws {400}: Missing parameters
 * @throws {400}: Invalid satisfaction satisfactions must be a array<string>
 * @throws {400}: Invalid satisfaction satisfactions must contain "À retirer"
 * @throws {401}: Wrong admin code
 * @throws {400}: Campaign already exist
 * @throws {200}: Campaign created
 * @throws {500}: Internal error
 **/
export default async function createCampaign(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.name != 'string' ||
		typeof req.body.script != 'string' ||
		typeof req.body.adminCode != 'string' ||
		typeof req.body.password != 'string' ||
		(typeof req.body.callHoursStart != 'undefined' && typeof req.body.callHoursStart != 'number') ||
		(typeof req.body.callHoursEnd != 'undefined' && typeof req.body.callHoursEnd != 'number') ||
		(typeof req.body.satisfactions != 'undefined' && !Array.isArray(req.body.satisfactions)) ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', __filename);
		return;
	}

	if (req.body.satisfactions && req.body.satisfactions.some((s: any) => typeof s != 'string')) {
		res.status(400).send({ message: 'Invalid satisfaction, satisfactions must be a array<string>', OK: false });
		log(`Invalid satisfaction from ${ip}`, 'WARNING', __filename);
		return;
	}

	if (req.body.satisfactions && !req.body.satisfactions.includes('À retirer')) {
		res.status(400).send({
			message: 'Invalid satisfaction, satisfactions must contain "À retirer"',
			OK: false
		});
		log(`Invalid satisfaction from ${ip}`, 'WARNING', __filename);
		return;
	}

	const area = await Area.findOne({ adminPassword: { $eq: req.body.adminCode }, _id: { $eq: req.body.area } });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', __filename);
		return;
	}

	if ((await Campaign.findOne({ name: { $eq: req.body.name }, area: area._id })) != null) {
		res.status(400).send({ message: 'Campaign already exist', OK: false });
		log(`Campaign already exist from ${area.name} (${ip})`, 'WARNING', __filename);
		return;
	}

	const campaign = new Campaign({
		area: area._id,
		name: req.body.name,
		script: req.body.script,
		password: req.body.password,
		callHoursStart: req.body.callHoursStart,
		callHoursEnd: req.body.callHoursEnd,
		status: req.body.satisfactions
	});
	await campaign.save();
	await Area.updateOne({ _id: area._id }, { $push: { CampaignList: campaign._id } });
	res.status(200).send({ message: 'Campaign created', OK: true });
	log(`Campaign created from ${area.name} (${ip})`, 'INFO', __filename);
}
