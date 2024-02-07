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
	if (!campaignAvaible) {
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

	const areaCombo = {
		area: { name: areaAvaible.name },
		campaignAvaible: campaignAvaible.map(c => {
			return { name: c.name, _id: c._id, area: c.area };
		})
	};
	res.status(200).send({ message: 'OK', OK: true, data: { caller: caller, areaCombo: areaCombo } });
	log(`Login success for ${caller.name} (${ip})`, 'INFORMATION', 'login.ts');
	return;
}
