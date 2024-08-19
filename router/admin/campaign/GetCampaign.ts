import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { Campaign } from '../../../Models/Campaign';
import { log } from '../../../tools/log';

export default async function getCampaign(req: Request<any>, res: Response<any>) {
	const ip = req.hostname;
	if (
		!req.body ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.CampaignId) ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from: ` + ip, 'WARNING', __filename);
		return;
	}

	const area = await Area.findOne({ adminPassword: { $eq: req.body.adminCode }, _id: { $eq: req.body.area } }, [
		'_id',
		'name'
	]);
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ` + ip, 'WARNING', __filename);
		return;
	}
	const campaign = await Campaign.findOne({ area: area._id, _id: { $eq: req.body.CampaignId } }, [
		'_id',
		'name',
		'active',
		'callHours',
		'timeBetweenCall',
		'numberMaxCall',
		'script',
		'callPermited',
		'nbMaxCallCampaign',
		'satisfactions'
	]);
	if (!campaign) {
		res.status(404).send({ message: 'no campaign', OK: false });
		log(`no campaign from ${area.name} (${ip})`, 'WARNING', __filename);
		return;
	}

	res.status(200).send({ message: 'OK', OK: true, data: campaign });
	log(`list campaign from ${area.name} (${ip})`, 'INFO', __filename);
}
