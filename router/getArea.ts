import { Request, Response } from 'express';
import { log } from '../tools/log';
import { Area } from '../Models/Area';

export default async function getArea(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();

	const area = await Area.find();
	if (!area) {
		res.status(500).send({ message: 'Internal error', OK: false });
		log(`Error while getting area from ` + ip, 'CRITICAL', 'getArea.ts');
		return;
	}
	log(`Get area from ` + ip, 'INFORMATION', 'getArea.ts');
	res.status(200).send({
		message: 'OK',
		OK: true,
		data: area.map(a => {
			return { name: a.name, _id: a._id };
		})
	});
}
