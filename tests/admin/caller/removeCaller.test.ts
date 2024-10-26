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

describe('post on /api/admin/caller/removeCaller', () => {
	it('should return 400 if wrong phone number', async () => {
		const res = await request(app).post('/api/admin/caller/removeCaller').send({
			adminCode: 'adminPassword',
			area: areaId,
			phone: '123456789'
		});
		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty('message', 'Wrong phone number');
	});

	it('should return 400 if invalid area', async () => {
		const res = await request(app).post('/api/admin/caller/removeCaller').send({
			adminCode: 'adminPassword',
			area: new mongoose.Types.ObjectId(),
			phone: '+33223456780'
		});
		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty('message', 'Invalid area');
	});

	it('should return 400 if caller not found', async () => {
		const res = await request(app).post('/api/admin/caller/removeCaller').send({
			adminCode: 'adminPassword',
			area: areaId,
			phone: '+33223456780'
		});
		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty('message', 'Caller not found');
	});

	it('should return 200 if caller removed', async () => {
		await Caller.create({
			phone: '+33223456780',
			area: areaId,
			name: 'caller',
			pinCode: '1234'
		});
		const res = await request(app).post('/api/admin/caller/removeCaller').send({
			adminCode: 'adminPassword',
			area: areaId,
			phone: '+33223456780'
		});
		expect(res.status).toBe(200);
		expect(res.body).toHaveProperty('message', 'Caller removed');
	});
});
