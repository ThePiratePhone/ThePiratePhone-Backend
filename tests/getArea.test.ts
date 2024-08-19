import mongoose from 'mongoose';
import request from 'supertest';
import dotenv from 'dotenv';
import { Area } from '../Models/Area';
import app from '../index';

dotenv.config({ path: '.env' });

beforeAll(async () => {
	await mongoose.connect(process.env.URITEST ?? '');
	await Area.deleteMany({});
});

afterAll(async () => {
	await mongoose.connection.close();
});

describe('post on /getArea', () => {
	// return: { message: 'No area fond', OK: false }
	it('Should return 404 if no area fond', async () => {
		const res = await request(app).get('/api/getArea');
		expect(res.status).toBe(404);
		expect(res.body).toEqual({ message: 'No area fond', OK: false });
	});

	it('Should return 200 and data if area found', async () => {
		// return: { name: 'area1', _id: mogoId }
		await Area.create({ name: 'area1', password: 'password', campaignList: [], adminPassword: 'adminPassword' });
		const res = await request(app).get('/api/getArea');
		expect(res.status).toBe(200);
		expect(res.body).toEqual({
			message: 'OK',
			OK: true,
			data: [{ name: 'area1', _id: expect.any(String) }]
		});
	});
});
