import { Request, Response } from 'express';
import { log } from '../tools/log';
import { Area } from '../Models/area';

export default async function getArea(req: Request<any>, res: Response<any>) {
	const area = await Area.find().select('"name" "id"');
	log(`Get area`, 'INFORMATION', 'getArea');
	res.status(200).send({ message: 'OK', OK: true, data: area });
}
