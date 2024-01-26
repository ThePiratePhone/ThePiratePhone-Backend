import { Request, Response } from 'express';
import { log } from '../../tools/log';
import { Area } from '../../Models/area';
import { Caller } from '../../Models/Caller';
import phoneNumberCheck from '../../tools/phoneNumberCheck';

export default async function createCaller(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.name != 'string' ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		typeof req.body.adminCode != 'string'
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log('Missing parameters', 'WARNING', 'createCaller.ts');
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log('Wrong admin code from ' + ip, 'WARNING', 'createCaller.ts');
		return;
	}

	if (req.body.phone.startsWith('0')) {
		req.body.phone = req.body.phone.replace('0', '+33');
	}

	if (!phoneNumberCheck(req.body.phone)) {
		res.status(400).send({ message: 'Wrong phone number', OK: false });
		log('Wrong phone number', 'WARNING', 'createCaller.ts');
		return;
	}

	if ((await Caller.findOne({ phone: req.body.phone })) || (await Caller.findOne({ name: req.body.name }))) {
		res.status(400).send({ message: 'User already exist', OK: false });
		log('User already exist', 'WARNING', 'createCaller.ts');
		return;
	}

	const caller = new Caller({
		name: req.body.name,
		phone: req.body.phone,
		pinCode: req.body.pinCode,
		area: area._id
	});

	try {
		await Promise.all([caller.save(), area.updateOne({ $push: { callerList: caller._id } })]);
		res.status(200).send({ message: 'user ' + caller.name + ' created', OK: true });
		log('user ' + caller.name + ' created from ' + ip, 'INFORMATION', 'createCaller.ts');
	} catch (error: any) {
		res.status(500).send({ message: 'Internal server error', OK: false });
		log('Internal server error: ' + error.message, 'ERROR', 'createCaller.ts');
	}
}
