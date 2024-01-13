import { Request, Response } from 'express';
import { Client } from '../Models/Client';

export default function NewClient(req: Request<any>, res: Response<any>) {
	if (req.body.name == null || req.body.phone == null) {
		res.status(400).send('Missing parameters');
		return;
	}

	if (
		req.body.name == '' ||
		typeof req.body.name != 'string' ||
		req.body.phone == '' ||
		typeof req.body.phone != 'string'
	) {
		res.status(400).send('Invalid parameters');
		return;
	}

	const client = new Client({ name: req.body.name, phone: req.body.phone, called: 'not called' });
	client
		.save()
		.then(() => {
			res.status(201).send('Client created');
		})
		.catch(error => {
			res.status(500).send('Error creating client: ' + error);
		});
}
