import { Request, Response } from 'express';
import { Area } from '../../Models/area';
import AreaCampaignProgress from '../../tools/areaCampaignProgress';
import { log } from '../../tools/log';
import { Caller } from '../../Models/Caller';

export default async function exportClientCsv(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		(req.body.curentCamaign && typeof req.body.curentCamaign != 'boolean') ||
		typeof req.body.adminCode != 'string'
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', 'exportClientCsv.ts');
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', 'exportClientCsv.ts');
		return;
	}
	let selector: {} = { area: area._id };

	const campaign = (await AreaCampaignProgress(area)) as any;
	if (req.body.curentCamaign) {
		if (!campaign) {
			res.status(200).send({ message: 'No campaign in progress', OK: false });
			log(`No campaign in progress from ${ip}`, 'WARNING', 'exportClientCsv.ts');
			return;
		}
		selector = { _id: { $in: campaign.callerList } };
	}

	res.setHeader('Content-Disposition', 'attachment; filename=export.csv');
	res.setHeader('Content-Type', 'text/csv');
	res.write('name;phone;area\n');

	const numberOfCaller = await Caller.countDocuments(selector);
	for (let i = 0; i < numberOfCaller; i += 1000) {
		const callers = await Caller.find(selector).limit(1000).skip(i);
		callers.forEach(caller => {
			res.write(`${caller.name};${caller.phone};${caller.area}\n`);
		});
	}

	res.end();
	log(`Exported ${numberOfCaller} callers from ${ip}`, 'INFORMATION', 'exportCallerCsv.ts');
}
