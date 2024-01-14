import { Request, Response } from 'express';
import { Log } from '../tools/log';
import phoneNumberCheck from '../tools/phoneNumberCheck';
import { Campaign } from '../Models/Campaign';
import { Caller } from '../Models/Caller';

export default async function addCallerCampaign(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (req.body == null || req.body.phone == null || req.body.campaingNane == null || !req.body.adminCode) {
		Log('Missing parameters from ' + ip, 'WARNING', 'NewCaller.ts');
		res.status(400).send({ message: 'Missing parameters', OK: false });
		return;
	}

	if (
		typeof req.body.phone != 'string' ||
		typeof req.body.campaingNane != 'string' ||
		typeof req.body.adminCode != 'string'
	) {
		Log('Invalid parameters from ' + ip, 'WARNING', 'NewCaller.ts');
		res.status(400).send({ message: 'Invalid parameters', OK: false });
		return;
	}

	if (req.body.adminCode != process.env.ADMIN_PASSWORD) {
		Log('Invalid admin code from ' + ip, 'WARNING', 'NewCaller.ts');
		res.status(400).send({ message: 'Invalid admin code', OK: false });
		return;
	}

	if (!phoneNumberCheck(req.body.phone)) {
		Log('Invalid phone number from ' + ip, 'WARNING', 'NewCaller.ts');
		res.status(400).send({ message: 'Invalid phone number', OK: false });
		return;
	}

	if (req.body.phone.startsWith('0')) {
		req.body.phone = req.body.phone.replace('0', '+33');
	}

	const caller = await Caller.findOne({ phone: req.body.phone });
	if (!caller) {
		Log('Caller not found from ' + ip, 'WARNING', 'NewCaller.ts');
		res.status(404).send({ message: 'Caller not found', OK: false });
		return;
	}

	const campaing = await Campaign.findOne({ name: req.body.campaingNane });
	if (!campaing) {
		Log('Campaing not found from ' + ip, 'WARNING', 'NewCaller.ts');
		res.status(404).send({ message: 'Campaing not found', OK: false });
		return;
	}

	if (campaing.callerList.includes(caller._id)) {
		Log('Caller already in campaing from ' + ip, 'WARNING', 'NewCaller.ts');
		res.status(400).send({ message: 'Caller already in campaing', OK: false });
		return;
	}

	campaing.callerList.push(caller._id);
	await campaing.save();

	Log('Caller added to campaing from ' + ip, 'INFORMATION', 'NewCaller.ts');
	res.status(200).send({ message: 'Caller added to campaing', OK: true });
}
