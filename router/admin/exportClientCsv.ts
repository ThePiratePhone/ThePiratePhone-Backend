import { Request, Response } from 'express';
import { Area } from '../../Models/area';
import AreaCampaignProgress from '../../tools/areaCampaignProgress';
import { Client } from '../../Models/Client';
import { log } from '../../tools/log';
import * as csv from '@fast-csv/format';
import { ObjectId } from 'mongodb';

export default async function exportClientCsv(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		(req.body.curentCamaign && typeof req.body.curentCamaign != 'boolean') ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', 'exportClientCsv.ts');
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode, _id: req.body.area });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', 'exportClientCsv.ts');
		return;
	}
	let selector = { area: area._id };

	const campaign = (await AreaCampaignProgress(area)) as any;
	if (req.body.curentCamaign) {
		if (!campaign) {
			res.status(200).send({ message: 'No campaign in progress', OK: false });
			log(`No campaign in progress from ${ip}`, 'WARNING', 'exportClientCsv.ts');
			return;
		}
		selector = { area: area._id, [`data.${campaign._id}`]: { $exists: true, $not: { $size: 0 } } };
	}

	res.setHeader('Content-Disposition', 'attachment; filename=export.csv');
	res.setHeader('Content-Type', 'text/csv');

	const csvStream = csv.format({ headers: true, delimiter: ';' });
	csvStream.pipe(res);

	const numberOfClients = await Client.countDocuments(selector);
	for (let i = 0; i < numberOfClients; i += 500) {
		const clients = await Client.find(selector).limit(500).skip(i);
		if (!clients) {
			return;
		}
		clients.forEach(client => {
			if (req.body.curentCamaign) {
				const csvData = {};
				for (let i = 1; i <= 4; i++) {
					const dataKeyPrefix = `data${i}`;
					csvData[`${dataKeyPrefix}.status`] = client?.data.get(campaign._id)?.[i - 1]?.status ?? '';
					csvData[`${dataKeyPrefix}.caller`] = client?.data.get(campaign._id)?.[i - 1]?.caller ?? '';
					csvData[`${dataKeyPrefix}.scriptVersion`] =
						client?.data.get(campaign._id)?.[i - 1]?.scriptVersion ?? '';
					csvData[`${dataKeyPrefix}.startCall`] = client?.data.get(campaign._id)?.[i - 1]?.startCall ?? '';
					csvData[`${dataKeyPrefix}.endCall`] = client?.data.get(campaign._id)?.[i - 1]?.endCall ?? '';
					csvData[`${dataKeyPrefix}.satisfaction`] =
						client?.data.get(campaign._id)?.[i - 1]?.satisfaction ?? '';
					csvData[`${dataKeyPrefix}.comment`] = client?.data.get(campaign._id)?.[i - 1]?.comment ?? '';
				}

				csvStream.write({
					name: client.name,
					phone: client.phone,
					institution: client.institution,
					promotion: client.promotion,
					...csvData
				});
			} else {
				csvStream.write({
					name: client.name,
					phone: client.phone,
					institution: client.institution,
					promotion: client.promotion
				});
			}
		});
	}
	csvStream.end();
	res.end();
	log(`Exported ${numberOfClients} clients from ${ip} (${area.name})`, 'INFORMATION', 'exportClientCsv.ts');
}
