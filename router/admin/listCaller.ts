import { Request, Response } from 'express';
import { log } from '../../tools/log';
import { Area } from '../../Models/area';
import { Caller } from '../../Models/Caller';

export default async function listCaller(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.adminCode != 'string' ||
		(req.body.skip && typeof req.body.skip != 'number') ||
		(req.body.limit && typeof req.body.limit != 'number')
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log('Missing parameters from: ' + ip, 'WARNING', 'listCaller.ts');
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log('Wrong admin code from ' + ip, 'WARNING', 'listCaller.ts');
		return;
	}

	const callers = await Caller.find({ area: area._id })
		.skip(req.body.skip ? req.body.skip : 0)
		.limit(req.body.limit ? req.body.limit : 50);
	if (!callers) {
		res.status(404).send({ message: 'No caller found', OK: false });
		log('No caller found from ' + ip, 'WARNING', 'listCaller.ts');
		return;
	}

	res.status(200).send({ message: 'OK', OK: true, data: { callers: callers } });
	log('caller list send to ' + ip, 'INFORMATION', 'listCaller.ts');
}
