import { Request, Response } from 'express';
import { Area } from '../../Models/area';
import AreaCampaignProgress from '../../tools/areaCampaignProgress';
import { Client } from '../../Models/Client';
import { log } from '../../tools/log';

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
	res.write(
		'name;phone;institution;promotion;data.0.status;data.0.caller;data.0.scriptVersion;data.0.startCall;data.0.endCall;data.0.satisfaction;data.1.status;data.1.caller;data.1.scriptVersion;data.1.startCall;data.1.endCall;data.1.satisfaction;data.2.status;data.2.caller;data.2.scriptVersion;data.2.startCall;data.2.endCall;data.2.satisfaction;data.3.status;data.3.caller;data.3.scriptVersion;data.3.startCall;data.3.endCall;data.3.satisfaction\n'
	);

	const numberOfClients = await Client.countDocuments(selector);
	for (let i = 0; i < numberOfClients; i += 1000) {
		const clients = await Client.find(selector).limit(1000).skip(i);
		clients.forEach(client => {
			if (req.body.curentCamaign) {
				const data = client.data.get(campaign._id);
				if (!data) return;
				res.write(`${client.name};${client.phone};${client.institution ?? ''};${client.promotion ?? ''};`);
				for (let j = 0; j < 4; j++) {
					if (data.length > j) {
						res.write(
							`${data[j].status ?? ''};${data[j].caller ?? ''};${data[j].scriptVersion ?? ''};${
								data[j].startCall ?? ''
							};${data[j].endCall ?? ''};${data[j].satisfaction ?? ''};`
						);
					} else {
						res.write(';;;;;;');
					}
				}
				res.write('\n');
			} else {
				res.write(`${client.name};${client.phone};${client.institution ?? ''};${client.promotion ?? ''}\n`);
			}
		});
	}
	res.end();
	log(
		`Exported ${numberOfClients} clients from ${ip} ` +
			(req.body.curentCamaign ? `for campaign ${campaign.name}(${area.name})` : ''),
		'INFORMATION',
		'exportClientCsv.ts'
	);
}
