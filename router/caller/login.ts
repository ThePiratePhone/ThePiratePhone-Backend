import { Request, Response } from 'express';

import checkCredentials from '../../tools/checkCredentials';
import { log } from '../../tools/log';
import { Area } from '../../Models/area';
import { Campaign } from '../../Models/Campaign';
import { Types } from 'mongoose';

export default async function login(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();

	if (!req.body || typeof req.body.phone != 'string' || typeof req.body.pinCode != 'string') {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from: ` + ip, 'WARNING', 'login.ts');
		return;
	}

	if (req.body.pinCode.length != 4) {
		res.status(400).send({ message: 'Wrong pin code', OK: false });
		log(`Wrong pin code from: ` + ip, 'WARNING', 'login.ts');
		return;
	}

	const caller = await checkCredentials(req.body.phone, req.body.pinCode);
	if (!caller) {
		res.status(403).send({ message: 'Wrong credentials', OK: false });
		log(`Wrong credentials from: ` + ip, 'WARNING', 'login.ts');
		return;
	}

	const campaignAvailable = await Campaign.find({
		$or: [
			{
				area: caller.area
			},
			{
				callerList: caller._id
			}
		]
	});
	if (!campaignAvailable) {
		res.status(400).send({ message: 'Campaign not found', OK: false });
		log(`Campaign not found for ${caller.name} (${ip})`, 'WARNING', 'login.ts');
		return;
	}
	const areaAvaible = await Area.findOne({ _id: caller.area });
	if (!areaAvaible) {
		res.status(400).send({ message: 'Area not found', OK: false });
		log(`Area not found for ${caller.name} (${ip})`, 'WARNING', 'login.ts');
		return;
	}
	let areaCombo: {
		area: { name: string; _id: Types.ObjectId };
		campaignAvailable: { name: string; _id: Types.ObjectId; areaId: Types.ObjectId; areaName: string }[];
	};
	try {
		areaCombo = {
			area: { name: areaAvaible.name, _id: areaAvaible._id },
			campaignAvailable: await Promise.all(
				campaignAvailable.map(async c => {
					const cArea = await Area.findById(c.area);
					if (!cArea) {
						throw 'error';
					}
					return { name: c.name, _id: c._id, areaId: cArea?._id, areaName: cArea?.name };
				})
			)
		};
	} catch (error) {
		res.status(500).send({ message: 'area of campaign not found', OK: false });
		log(`area of campaign not found for ${caller.name} (${ip})`, 'ERROR', 'login.ts');
		return;
	}
	res.status(200).send({ message: 'OK', OK: true, data: { caller: caller, areaCombo: areaCombo } });
	log(`Login success for ${caller.name} (${ip})`, 'INFORMATION', 'login.ts');
	return;
}
