import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { log } from '../../../tools/log';
import clearPhone from '../../../tools/clearPhone';
import phoneNumberCheck from '../../../tools/phoneNumberCheck';
import { Caller } from '../../../Models/Caller';
import { Area } from '../../../Models/Area';
import { Client } from '../../../Models/Client';
import { Campaign } from '../../../Models/Campaign';
import getCurrentCampaign from '../../../tools/getCurrentCampaign';

export default async function callerInfo(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.adminCode != 'string' ||
		typeof req.body.phone != 'string' ||
		!ObjectId.isValid(req.body.area) ||
		(req.body.CampaignId && !ObjectId.isValid(req.body.CampaignId))
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', 'callerInfo.ts');
		return;
	}

	req.body.phone = clearPhone(req.body.phone);
	if (!phoneNumberCheck(req.body.phone)) {
		res.status(400).send({ message: 'Wrong phone number', OK: false });
		log(`Wrong phone number from: ` + ip, 'WARNING', 'callerInfo.ts');
		return;
	}

	const caller = await Caller.findOne({ phone: req.body.phone, area: req.body.area, pinCode: req.body.pinCode });
	if (!caller) {
		res.status(404).send({ message: 'Caller not found', OK: false });
		log(`Caller not found from: ` + ip, 'WARNING', 'callerInfo.ts');
		return;
	}

	const area = await Area.findOne({ _id: req.body.area });
	if (!area) {
		res.status(404).send({ message: 'area not found', OK: false });
		log(`Area not found from: ${caller.name} (${ip})`, 'WARNING', 'callerInfo.ts');
		return;
	}

	let campaign;
	if (req.body.CampaignId) {
		campaign = await Campaign.findOne({ _id: req.body.CampaignId, Area: area._id });
	} else {
		campaign = await getCurrentCampaign(area._id);
	}
	if (!campaign) {
		res.status(401).send({ message: 'Wrong campaign id', OK: false });
		log(`Wrong campaign id from ${area.name} (${ip})`, 'WARNING', 'changeCallHours.ts');
		return;
	}

	const call = await Caller.findOne({ area: req.body.area, phone: req.body.otherPhone });
	if (!call) {
		res.status(404).send({ message: 'Caller not found', OK: false });
		log(`Caller not found from: ` + ip, 'WARNING', 'callerInfo.ts');
		return;
	}
	res.status(200).send({
		message: 'OK',
		OK: true,
		data: {
			name: call.name,
			phone: call.phone,
			totalTime: call.timeInCall.reduce((acc, cur) => acc + cur.time, 0),
			nbCalls: call.timeInCall.length
		}
	});
}
