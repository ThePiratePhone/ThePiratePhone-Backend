import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../Models/Area';
import { Client } from '../../Models/Client';
import clearPhone from '../../tools/clearPhone';
import { log } from '../../tools/log';
import phoneNumberCheck from '../../tools/phoneNumberCheck';
import getCurrentCampaign from '../../tools/getCurrentCampaign';
import mongoose from 'mongoose';

export default async function createClients(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		!(req.body.data instanceof Array) ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', 'createClient.ts');
		return;
	}

	if (req.body.data.length > 500) {
		res.status(400).send({ message: 'Too many users', OK: false });
		log(`Too many users from ` + ip, 'WARNING', 'createClient.ts');
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode, _id: req.body.area });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', 'createClient.ts');
		return;
	}

	const campaign = await getCurrentCampaign(area._id);

	const errors: Array<[string, string, string]> = [];
	const sleep = req.body.data.map(async (usr: [string, string]) => {
		const phone = clearPhone(usr[1]);

		if (!phoneNumberCheck(phone)) {
			errors.push([usr[0], phone, 'Wrong phone number']);
			return false;
		}
		const data = new Map();
		if (campaign) {
			data.set((campaign as any)._id, {
				status: 'not called'
			});
		}
		const user = new Client({
			area: area._id,
			name: usr[0] ?? null,
			phone: phone,
			data: new Map(),
			promotion: req.body.promotion ?? null,
			institution: req.body.institution ?? null
		});
		try {
			await user.save();
			return true;
		} catch (error: any) {
			if (error.code != 11000) {
				errors.push([usr[0], phone, error.message]);
			}
		}
	});
	await Promise.all(sleep);
	res.status(200).send({ message: 'OK', OK: true, errors: errors });
}
