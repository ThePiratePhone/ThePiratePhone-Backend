import dotenv from 'dotenv';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../../index';
import { Area } from '../../../Models/Area';
import { Caller } from '../../../Models/Caller';
dotenv.config({ path: '.env' });
let areaId: mongoose.Types.ObjectId | undefined;
let callerId: mongoose.Types.ObjectId | undefined;

beforeAll(async () => {
	await mongoose.connect(process.env.URITEST ?? '');
	await Caller.deleteMany({});
	await Area.deleteMany({});
	await Caller.deleteMany({});

	areaId = (
		await Area.create({
			name: 'changepassordtest',
			password: 'password',
			campaignList: [],
			adminPassword: 'adminPassword'
		})
	)._id;
});

afterAll(async () => {
	await mongoose.connection.close();
});

describe('post on /api/admin/caller/listCaller', () => {
	it('should return 401 if wrong admin code', async () => {
		const res = await request(app).post('/api/admin/caller/listCaller').send({
			adminCode: 'wrongCode',
			area: areaId
		});
		expect(res.status).toBe(401);
		expect(res.body).toHaveProperty('message', 'Wrong admin code');
	});

	it('should return 404 if no caller found', async () => {
		const res = await request(app).post('/api/admin/caller/listCaller').send({
			adminCode: 'adminPassword',
			area: areaId
		});
		expect(res.status).toBe(404);
		expect(res.body).toHaveProperty('message', 'No caller found');
	});

	it('should return 200 if caller found', async () => {
		callerId = (
			await Caller.create({
				name: 'caller',
				password: 'password',
				area: areaId,
				phone: '+33123456789',
				pinCode: '1234'
			})
		)._id;
		const res = await request(app).post('/api/admin/caller/listCaller').send({
			adminCode: 'adminPassword',
			area: areaId
		});
		expect(res.status).toBe(200);
		expect(res.body.message).toBe('OK');
		expect(res.body.OK).toBe(true);
		expect(res.body.data.callers).toBeInstanceOf(Array);
		expect(res.body.data.numberOfCallers).toBe(1);
	});
});
