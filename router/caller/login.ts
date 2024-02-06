import { Request, Response } from 'express';

import checkCredentials from '../../tools/checkCredentials';
import { log } from '../../tools/log';
import { Area } from '../../Models/area';
import { Campaign } from '../../Models/Campaign';

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

	const campaignAvaible = await Campaign.find({
		$or: [
			{
				area: caller.area
			},
			{
				callerList: caller._id
			}
		]
	});
	let error = false;
	const areaComboPromises = campaignAvaible.map(async campaign => {
		const area = await Area.findById(campaign.area);
		if (!area) {
			error = true;
			return null;
		}
		return {
			areaName: area.name,
			areaId: area._id,
			campaignName: campaign.name,
			campaignId: campaign._id
		};
	});

	const areaCombo = await Promise.all(areaComboPromises);

	if (error) {
		return res.status(400).send({ message: 'Error in data', OK: false });
	}

	res.status(200).send({ message: 'OK', OK: true, data: { caller: caller, areaCombo: areaCombo } });
	log(`Login success for ${caller.name} from: ${caller.name} (${ip})`, 'INFORMATION', 'login.ts');
	return;
}
