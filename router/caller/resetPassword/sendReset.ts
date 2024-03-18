import { ObjectId } from 'mongodb';
import { log } from '../../../tools/log';
import { Request, Response } from 'express';
import clearPhone from '../../../tools/clearPhone';
import phoneNumberCheck from '../../../tools/phoneNumberCheck';
import generateSecureRandomCode from '../../../tools/generateSecureRandomCode';
import sendSms from '../../../tools/sendSms';
import { Caller } from '../../../Models/Caller';
import bolderize from '../../../tools/bolderize';

export default async function sendReset(
	req: Request<any>,
	res: Response<any>,
	resetPassword: Map<String, { date: Date; password: String; try: number }>
) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (!req.body || typeof req.body.phone != 'string' || !ObjectId.isValid(req.body.area)) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', 'sendReset.ts');
		return;
	}

	req.body.phone = clearPhone(req.body.phone);
	if (!phoneNumberCheck(req.body.phone)) {
		res.status(400).send({ message: 'Invalid phone number', OK: false });
		log(`Invalid phone number from ` + ip, 'WARNING', 'sendReset.ts');
		return;
	}

	const caller = await Caller.findOne({ phone: req.body.phone, area: req.body.area });
	if (!caller) {
		res.status(400).send({ message: 'Phone number not found', OK: false });
		log(`Phone number not found from ` + ip, 'WARNING', 'sendReset.ts');
		return;
	}

	const password = generateSecureRandomCode(6);
	resetPassword.set(req.body.phone, { date: new Date(), password, try: 0 });

	const sms = sendSms(
		req.body.phone,
		`votre mots de passe temporaire est:
${password}
ce mot de passe est valable 10 minutes
si vous n'avez pas demandé de réinitialisation de mot de passe, veuillez contacter votre responsables
${bolderize('ne repondez pas a ce message')}`
	);
	if (!sms) {
		res.status(500).send({ message: 'Error sending sms', OK: false });
		log(`Error sending sms from ` + ip, 'ERROR', 'sendReset.ts');
		return;
	}

	res.status(200).send({ message: 'Password sent', OK: true });
	log(`caller ${caller.name} (${caller.phone}) ask to reset the password`, 'INFORMATION', 'sendReset.ts');
}
