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
				csvStream.write({
					name: client.name,
					phone: client.phone,
					institution: client.institution,
					promotion: client.promotion,
					'data1.status': client?.data.get(campaign._id)?.[0]?.status ?? '',
					'data2.status': client?.data.get(campaign._id)?.[1]?.status ?? '',
					'data3.status': client?.data.get(campaign._id)?.[2]?.status ?? '',
					'data4.status': client?.data.get(campaign._id)?.[3]?.status ?? '',
					'data1.caller': client?.data.get(campaign._id)?.[0]?.caller ?? '',
					'data2.caller': client?.data.get(campaign._id)?.[1]?.caller ?? '',
					'data3.caller': client?.data.get(campaign._id)?.[2]?.caller ?? '',
					'data4.caller': client?.data.get(campaign._id)?.[3]?.caller ?? '',
					'data1.scriptVersion': client?.data.get(campaign._id)?.[0]?.scriptVersion ?? '',
					'data2.scriptVersion': client?.data.get(campaign._id)?.[1]?.scriptVersion ?? '',
					'data3.scriptVersion': client?.data.get(campaign._id)?.[2]?.scriptVersion ?? '',
					'data4.scriptVersion': client?.data.get(campaign._id)?.[3]?.scriptVersion ?? '',
					'data1.startCall': client?.data.get(campaign._id)?.[0]?.startCall ?? '',
					'data2.startCall': client?.data.get(campaign._id)?.[1]?.startCall ?? '',
					'data3.startCall': client?.data.get(campaign._id)?.[2]?.startCall ?? '',
					'data4.startCall': client?.data.get(campaign._id)?.[3]?.startCall ?? '',
					'data1.endCall': client?.data.get(campaign._id)?.[0]?.endCall ?? '',
					'data2.endCall': client?.data.get(campaign._id)?.[1]?.endCall ?? '',
					'data3.endCall': client?.data.get(campaign._id)?.[2]?.endCall ?? '',
					'data4.endCall': client?.data.get(campaign._id)?.[3]?.endCall ?? '',
					'data1.satisfaction': client?.data.get(campaign._id)?.[0]?.satisfaction ?? '',
					'data2.satisfaction': client?.data.get(campaign._id)?.[1]?.satisfaction ?? '',
					'data3.satisfaction': client?.data.get(campaign._id)?.[2]?.satisfaction ?? '',
					'data4.satisfaction': client?.data.get(campaign._id)?.[3]?.satisfaction ?? '',
					'data1.comment': client?.data.get(campaign._id)?.[0]?.comment ?? '',
					'data2.comment': client?.data.get(campaign._id)?.[1]?.comment ?? '',
					'data3.comment': client?.data.get(campaign._id)?.[2]?.comment ?? '',
					'data4.comment': client?.data.get(campaign._id)?.[3]?.comment ?? ''
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
