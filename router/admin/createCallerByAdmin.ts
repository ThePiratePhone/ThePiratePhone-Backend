import { Request, Response } from 'express';
import { log } from '../../tools/log';
import { Area } from '../../Models/Area';
import { Caller } from '../../Models/Caller';
import phoneNumberCheck from '../../tools/phoneNumberCheck';
import clearPhone from '../../tools/clearPhone';
import { ObjectId } from 'mongodb';

export default async function createCaller(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.name != 'string' ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', 'createCaller.ts');
		return;
	}

	if (req.body.pinCode.length != 4) {
		res.status(400).send({ message: 'Invalid pin code', OK: false });
		log(`Invalid pin code from: ` + ip, 'WARNING', 'createCaller.ts');
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode, _id: req.body.area });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ` + ip, 'WARNING', 'createCaller.ts');
		return;
	}

	req.body.phone = clearPhone(req.body.phone);

	if (!phoneNumberCheck(req.body.phone)) {
		res.status(400).send({ message: 'Wrong phone number', OK: false });
		log(`Wrong phone number from ${area.name} (${ip})`, 'WARNING', 'createCaller.ts');
		return;
	}

	if ((await Caller.findOne({ phone: req.body.phone })) || (await Caller.findOne({ name: req.body.name }))) {
		res.status(400).send({ message: 'caller already exist', OK: false });
		log(`caller already exist from ${area.name} (${ip})`, 'WARNING', 'createCaller.ts');
		return;
	}

	const caller = new Caller({
		name: req.body.name,
		phone: req.body.phone,
		pinCode: req.body.pinCode,
		area: area._id
	});

	try {
		await caller.save();
		res.status(200).send({ message: 'caller ' + caller.name + ' created', OK: true });
		log(`caller ${caller.name} created from ${area.name} (${ip})`, 'INFORMATION', 'createCaller.ts');
	} catch (error: any) {
		res.status(500).send({ message: 'Internal server error', OK: false });
		log(`Internal server error: from ${area.name} (${ip})` + error.message, 'ERROR', 'createCaller.ts');
	}
}
