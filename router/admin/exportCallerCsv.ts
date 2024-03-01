import { Request, Response } from 'express';
import { Area } from '../../Models/Area';
import AreaCampaignProgress from '../../tools/areaCampaignProgress';
import { log } from '../../tools/log';
import { Caller } from '../../Models/Caller';
import * as csv from '@fast-csv/format';
import { ObjectId } from 'mongodb';

export default async function exportCallerCsv(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		(req.body.curentCamaign && typeof req.body.curentCamaign != 'boolean') ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', 'exportCallerCsv.ts');
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode, _id: req.body.area });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', 'exportCallerCsv.ts');
		return;
	}
	let selector: {} = { area: area._id };

	const campaign = (await AreaCampaignProgress(area)) as any;
	if (req.body.curentCamaign) {
		if (!campaign) {
			res.status(200).send({ message: 'No campaign in progress', OK: false });
			log(`No campaign in progress from ${ip}`, 'WARNING', 'exportCallerCsv.ts');
			return;
		}
		console.log(campaign.callerList);
		selector = { $or: [{ _id: { $in: campaign.callerList } }, { area: area._id }] };
	}

	const csvStream = csv.format({ headers: true, delimiter: ';' });
	csvStream.pipe(res);

	res.setHeader('Content-Disposition', 'attachment; filename=export.csv');
	res.setHeader('Content-Type', 'text/csv');

	const numberOfCaller = await Caller.countDocuments(selector);
	for (let i = 0; i < numberOfCaller; i += 500) {
		const callers = await Caller.find(selector).limit(500).skip(i);
		callers.forEach(caller => {
			csvStream.write({
				name: caller.name,
				phone: caller.phone,
				area: caller.area
			});
		});
	}
	csvStream.end();
	res.end();
	log(`Exported ${numberOfCaller} callers from ${ip} (${area.name})`, 'INFORMATION', 'exportCallerCsv.ts');
}
