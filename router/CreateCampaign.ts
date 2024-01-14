import { Request, Response } from 'express';
import phoneNumberCheck from '../tools/phoneNumberCheck';
import { Log } from '../tools/log';
import { Area } from '../Models/area';
import { Client } from '../Models/Client';
import { Campaign } from '../Models/Campaign';

export default async function CreateCampaign(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.name != 'string' ||
		typeof req.body.script != 'string' ||
		typeof req.body.dateStart != 'string' ||
		typeof req.body.dateEnd != 'string' ||
		typeof req.body.userList != 'object' ||
		typeof req.body.callerList != 'object' ||
		typeof req.body.adminCode != 'string'
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		Log('Missing parameters', 'WARNING', 'CreateCampaign.ts');
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		Log('Wrong admin code from ' + ip, 'WARNING', 'Login.ts');
		return;
	}

	const dateEnd = new Date(req.body.dateEnd);
	const dateStart = new Date(req.body.dateStart);
	if (isNaN(dateEnd.getTime()) || isNaN(dateStart.getTime()) || dateEnd < dateStart) {
		res.status(400).send({ message: 'dateEnd < dateStart', OK: false });
		Log('dateEnd < dateStart', 'WARNING', 'CreateCampaign.ts');
		return;
	}

	if (await Campaign.findOne({ name: req.body.name })) {
		res.status(400).send({ message: 'Campaign already exist', OK: false });
		Log('Campaign already exist', 'WARNING', 'CreateCampaign.ts');
		return;
	}

	const campaign = new Campaign({
		area: area._id,
		name: req.body.name,
		script: req.body.script,
		dateStart: dateStart,
		dateEnd: dateEnd,
		userList: [],
		callerList: []
	});
	await campaign.save();
	res.status(200).send({ message: 'Campaign created', OK: true });
	Log('Campaign created from' + ip, 'INFORMATION', 'CreateCampaign.ts');
}