import { Request, Response } from 'express';
import checkCredentials from '../tools/checkCredentials';
import { Client } from '../Models/Client';
import getCurentCampaign from '../tools/getCurentCampaign';
import { Campaign } from '../Models/Campaign';
import { Area } from '../Models/area';
import { log } from '../tools/log';

export default async function clientBuster(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		typeof req.body.area != 'string' ||
		typeof req.body.clientPhone != 'string'
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log('Missing parameters from: ' + ip, 'WARNING', 'clientBuser.ts');
		return;
	}

	const caller = await checkCredentials(req.body.phone, req.body.area, req.body.pinCode);
	if (!caller) {
		res.status(403).send({ message: 'Invalid credential', OK: false });
		log('Invalid credential from: ' + ip, 'WARNING', 'clientBuser.ts');
		return;
	}

	const client = await Client.findOne({ phone: req.body.clientPhone, area: req.body.area });
	if (!client) {
		res.status(404).send({ message: 'Client not found', OK: false });
		log('Client not found from: ' + ip, 'WARNING', 'clientBuser.ts');
		return;
	}

	if (!caller.timeInCall.find(e => e.client == client._id)) {
		res.status(403).send({ message: 'you did not call this client', OK: false });
		log('you did not call this client from: ' + ip, 'WARNING', 'clientBuser.ts');
		return;
	}

	const campaign = (await getCurentCampaign(req.body.area)) as any;
	if (!campaign) {
		res.status(400).send({ message: 'invalid area', OK: false });
		log('invalid area from: ' + ip, 'WARNING', 'clientBuser.ts');
		return;
	}

	const area = await Area.findOne({ _id: req.body.area });
	if (!area) {
		res.status(400).send({ message: 'invalid area', OK: false });
		log('invalid area from: ' + ip, 'WARNING', 'addClientCampaign.ts');
		return;
	}

	await Client.deleteOne({ _id: client._id });
	await Campaign.updateOne({ _id: campaign._id }, { $pull: { userList: client._id } });
	await Area.updateOne({ _id: area._id }, { $pull: { userList: client._id } });

	res.status(200).send({ message: 'User deleted', OK: true });
	log('User deleted by: ' + ip, 'INFORMATION', 'addClientCampaign.ts');
}
