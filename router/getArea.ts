import { Request, Response } from 'express';
import { log } from '../tools/log';
import { Area } from '../Models/area';

export default async function getArea(req: Request<any>, res: Response<any>) {
	const area = await Area.find();
	if (!area) {
		res.status(500).send({ message: 'Internal error', OK: false });
		log(`Error while getting area`, 'CRITICAL', 'getArea.ts');
		return;
	}
	const rep = [{}];
	area.forEach(a => {
		rep.push({ name: a.name, _id: a._id });
	});
	log(`Get area`, 'INFORMATION', 'getArea.ts');
	res.status(200).send({ message: 'OK', OK: true, data: area });
}
