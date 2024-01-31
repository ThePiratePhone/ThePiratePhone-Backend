import { Request, Response } from 'express';
import phoneNumberCheck from '../../tools/phoneNumberCheck';
import { log } from '../../tools/log';
import { Area } from '../../Models/area';
import { Client } from '../../Models/Client';

export default async function createClient(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.name != 'string' ||
		(typeof req.body.promotion != 'undefined' && typeof req.body.promotion != 'string') ||
		(typeof req.body.institution != 'undefined' && typeof req.body.institution != 'string') ||
		typeof req.body.adminCode != 'string'
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log('Missing parameters', 'WARNING', 'createClient.ts');
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log('Wrong admin code from ' + ip, 'WARNING', 'createClient.ts');
		return;
	}

	if (req.body.phone.startsWith('0')) {
		req.body.phone = req.body.phone.replace('0', '+33');
	}
	if (!phoneNumberCheck(req.body.phone)) {
		res.status(400).send({ message: 'Wrong phone number', OK: false });
		log('Wrong phone number', 'WARNING', 'createClient.ts');
		return;
	}

	console.log(await Client.findOne({ name: req.body.name, area: area._id }));
	if (
		(await Client.findOne({ phone: req.body.phone, area: area._id })) != null ||
		(await Client.findOne({ name: req.body.name, area: area._id })) != null
	) {
		res.status(401).send({ message: 'User already exist', OK: false });
		log('User already exist', 'WARNING', 'createClient.ts');
		return;
	}

	const user = new Client({
		area: area._id,
		name: req.body.name,
		phone: req.body.phone,
		data: new Map(),
		promotion: req.body.promotion ?? null,
		institution: req.body.institution ?? null
	});
	await Area.updateOne({ _id: area._id }, { $push: { ClientList: user._id } });
	try {
		await user.save();
		res.status(200).send({ message: 'user ' + user.name + ' created', OK: true });
		log('user ' + user.name + ' created from ' + ip, 'INFORMATION', 'createClient.ts');
	} catch (error: any) {
		res.status(500).send({ message: 'Internal server error', OK: false });
		log('Internal server error: ' + error.message, 'ERROR', 'createClient.ts');
	}
}
