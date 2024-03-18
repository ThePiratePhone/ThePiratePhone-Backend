import { Request, Response } from 'express';
import { Caller } from '../../../Models/Caller';
import clearPhone from '../../../tools/clearPhone';
import { log } from '../../../tools/log';
import phoneNumberCheck from '../../../tools/phoneNumberCheck';
import { ObjectId } from 'mongodb';

export default async function resetCallerPassword(
	req: Request<any>,
	res: Response<any>,
	resetPassword: Map<String, { date: Date; password: String; try: number }>
) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.tryPassword != 'string' ||
		typeof req.body.newPin != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', 'resetCallerPassword.ts');
		return;
	}

	req.body.phone = clearPhone(req.body.phone);
	if (!phoneNumberCheck(req.body.phone)) {
		res.status(400).send({ message: 'Invalid phone number', OK: false });
		log(`Invalid phone number from ` + ip, 'WARNING', 'resetCallerPassword.ts');
		return;
	}

	const caller = await Caller.findOne({ phone: req.body.phone, area: req.body.area });
	if (!caller) {
		res.status(400).send({ message: 'Phone number not found', OK: false });
		log(`Phone number not found from ` + ip, 'WARNING', 'resetCallerPassword.ts');
		return;
	}

	const reset = resetPassword.get(req.body.phone);
	if ((reset?.try ?? 4) >= 3) {
		res.status(429).send({ message: 'Too many tries', OK: false });
		log(`Too many tries from ` + ip, 'WARNING', 'resetCallerPassword.ts');
		return;
	}

	if (new Date().getTime() - (reset?.date?.getTime() ?? 0) < 600_000) {
		res.status(408).send({ message: 'too long', OK: false });
		log(`too long from ` + ip, 'WARNING', 'resetCallerPassword.ts');
		return;
	}

	if (reset?.password != req.body.tryPassword) {
		log(`Wrong password from ` + ip, 'WARNING', 'resetCallerPassword.ts');
		res.status(401).send({
			message: 'Wrong password',
			data: { endDate: new Date((reset?.date.getTime() ?? 0) + 600_000), try: reset?.try },
			OK: false
		});
	}

	if (req.body.newPin.length != 4) {
		res.status(400).send({ message: 'Invalid new pin code', OK: false });
		log(`Invalid new pin code from: ` + ip, 'WARNING', 'resetCallerPassword.ts');
		return;
	}

	resetPassword.delete(req.body.phone);
	caller.pinCode = req.body.newPin;
	await caller.save();

	log(
		`user ${req.body.phone} password changed from: ${caller.name} (${ip})`,
		'INFORMATION',
		'resetCallerPassword.ts'
	);
	res.status(200).send({ message: 'password changed', OK: true });
}
