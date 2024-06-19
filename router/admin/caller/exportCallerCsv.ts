import * as csv from '@fast-csv/format';
import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { Caller } from '../../../Models/Caller';
import { log } from '../../../tools/log';
import { Campaign } from '../../../Models/Campaign';

export default async function exportCallerCsv(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		(req.body.curentCamaign && typeof req.body.curentCamaign != 'boolean') ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', __filename);
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode, _id: req.body.area });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', __filename);
		return;
	}
	let selector: {} = { area: area._id };

	const campaign = await Campaign.findOne({ area: area._id, active: true });
	if (req.body.curentCamaign) {
		if (!campaign) {
			res.status(200).send({ message: 'No campaign in progress', OK: false });
			log(`No campaign in progress from ${ip}`, 'WARNING', __filename);
			return;
		}
		selector = { $or: [{ campaigns: campaign._id }, { area: area._id }] };
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
	log(`Exported ${numberOfCaller} callers from ${ip} (${area.name})`, 'INFO', __filename);
}
