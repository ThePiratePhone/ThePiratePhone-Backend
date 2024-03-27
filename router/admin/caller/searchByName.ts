import { Request, Response } from 'express';
import { log } from '../../../tools/log';
import { ObjectId } from 'mongodb';
import { Area } from '../../../Models/Area';
import { Caller } from '../../../Models/Caller';

function escapeRegExp(input: string): string {
	return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default async function SearchByName(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.name != 'string' ||
		typeof req.body.adminCode != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', 'searchByName.ts');
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode, _id: req.body.area });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', 'searchByName.ts');
		return;
	}

	const escapedNameParts = (req.body.name as string).split(' ').map(escapeRegExp);
	const regexParts = escapedNameParts.map(part => `(?=.*${part})`).join('');
	const regex = new RegExp(`^${regexParts}`, 'i');
	const output = await Caller.find({ name: regex }).limit(10);

	res.status(200).send({ message: 'OK', OK: true, data: output });
	log(`Caller searched from ${ip} (${area.name})`, 'INFORMATION', 'searchByName.ts');
}
