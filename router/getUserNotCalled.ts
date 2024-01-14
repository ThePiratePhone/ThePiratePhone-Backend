import { Request, Response } from 'express';
import { Log } from '../tools/log';
import phoneNumberCheck from '../tools/phoneNumberCheck';
import checkCredential from '../tools/checkCreantial';
import { Campaign } from '../Models/Campaign';
import { Client } from '../Models/Client';

export default async function getUserNotCalled(req: Request<any>, res: Response<any>) {
	if (req.body == null || req.body.phone == null || req.body.campaingNane == null || !req.body.pin) {
		Log('Missing parameters from ' + req.ip, 'WARNING', 'NewClient.ts');
		res.status(400).send({ message: 'Missing parameters', OK: false });
		return;
	}

	if (
		typeof req.body.phone != 'string' ||
		typeof req.body.campaingNane != 'string' ||
		typeof req.body.pin != 'string'
	) {
		Log('Invalid parameters from ' + req.ip, 'WARNING', 'NewClient.ts');
		res.status(400).send({ message: 'Invalid parameters', OK: false });
		return;
	}

	if (!phoneNumberCheck(req.body.phone)) {
		Log('Invalid phone number from ' + req.ip, 'WARNING', 'NewClient.ts');
		res.status(400).send({ message: 'Invalid phone number', OK: false });
		return;
	}

	const caller = await checkCredential(req.body.phone, req.body.pin);
	if (!caller) {
		Log('Invalid credentials from ' + req.ip, 'WARNING', 'Login.ts');
		res.status(400).send({ message: 'Invalid credentials', OK: false });
		return;
	}

	const campaign = await Campaign.findOne({ name: req.body.campaingNane });
	if (!campaign) {
		Log('campaing not found from ' + req.ip, 'WARNING', 'NewClient.ts');
		res.status(404).send({ message: 'campaing not found', OK: false });
		return;
	}

	let client;
	let i = 0;

	while (i < campaign.userList.length && (!client || client.status != 'not called')) {
		client = await Client.findById(campaign.userList[i]);
		i++;
	}

	if (!client || client.status != 'not called') {
		Log('No client available from ' + req.ip, 'WARNING', 'NewClient.ts');
		res.status(404).send({ message: 'No client available', OK: false });
		return;
	}

	client.status = 'inprogress';
	client.startCall = new Date();
	client.caller = caller._id;
	client.scriptVersion = campaign.script.length - 1;
	await client.save();
	res.status(200).send({
		message: 'Client found',
		OK: true,
		data: { client: client, script: campaign.script[campaign.script.length - 1] }
	});
}
