import { Request, Response } from 'express';
import { Log } from '../tools/log';
import phoneNumberCheck from '../tools/phoneNumberCheck';
import { Campaign } from '../Models/Campaign';
import { Client } from '../Models/Client';

export default async function addClientCampaign(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (req.body == null || req.body.phone == null || req.body.campaingNane == null || !req.body.adminCode) {
		Log('Missing parameters from ' + ip, 'WARNING', 'NewClient.ts');
		res.status(400).send({ message: 'Missing parameters', OK: false });
		return;
	}

	if (
		typeof req.body.phone != 'string' ||
		typeof req.body.campaingNane != 'string' ||
		typeof req.body.adminCode != 'string'
	) {
		Log('Invalid parameters from ' + ip, 'WARNING', 'NewClient.ts');
		res.status(400).send({ message: 'Invalid parameters', OK: false });
		return;
	}

	if (req.body.adminCode != process.env.ADMIN_PASSWORD) {
		Log('Invalid admin code from ' + ip, 'WARNING', 'NewClient.ts');
		res.status(400).send({ message: 'Invalid admin code', OK: false });
		return;
	}

	if (req.body.phone.startsWith('0')) {
		req.body.phone = req.body.phone.replace('0', '+33');
	}

	if (!phoneNumberCheck(req.body.phone)) {
		Log('Invalid phone number from ' + ip, 'WARNING', 'NewClient.ts');
		res.status(400).send({ message: 'Invalid phone number', OK: false });
		return;
	}

	const client = await Client.findOne({ phone: req.body.phone });
	if (!client || !client._id) {
		Log('Client not found from ' + ip, 'WARNING', 'NewClient.ts');
		res.status(404).send({ message: 'Client not found', OK: false });
		return;
	}

	const campaing = await Campaign.findOne({ name: req.body.campaingNane });
	if (!campaing) {
		Log('Campaing not found from ' + ip, 'WARNING', 'NewClient.ts');
		res.status(404).send({ message: 'Campaing not found', OK: false });
		return;
	}

	if (campaing.userList.includes(client._id)) {
		Log('Client already in campaing from ' + ip, 'WARNING', 'NewClient.ts');
		res.status(400).send({ message: 'Client already in campaing', OK: false });
		return;
	}

	campaing.userList.push(client._id);
	await campaing.save();

	Log('Client added to campaing from ' + ip, 'INFORMATION', 'NewClient.ts');
	res.status(200).send({ message: 'Client added to campaing', OK: true });
}
