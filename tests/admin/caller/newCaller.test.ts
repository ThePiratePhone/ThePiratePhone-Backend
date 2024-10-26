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

describe('post on /api/admin/caller/createCaller', () => {
	it('should return 400 if invalid pin code', async () => {
		const res = await request(app).post('/api/admin/caller/createCaller').send({
			adminCode: 'adminPassword',
			area: areaId,
			phone: '+33223456780',
			pinCode: '123',
			name: 'caller'
		});
		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty('message', 'Invalid pin code');
	});

	it('should return 400 if wrong phone number', async () => {
		const res = await request(app).post('/api/admin/caller/createCaller').send({
			adminCode: 'adminPassword',
			area: areaId,
			phone: '123456789',
			pinCode: '1234',
			name: 'caller'
		});
		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty('message', 'Wrong phone number');
	});

	it('should return 400 if invalid credentials', async () => {
		const res = await request(app).post('/api/admin/caller/createCaller').send({
			adminCode: 'wrongCode',
			area: areaId,
			phone: '+33223456780',
			pinCode: '1234',
			name: 'caller'
		});
		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty('message', 'Invalid credentials');
	});

	it('should return 400 if caller already exist', async () => {
		callerId = (
			await Caller.create({
				name: 'caller',
				password: 'password',
				area: areaId,
				phone: '+33223456780',
				pinCode: '1234'
			})
		)._id;
		const res = await request(app).post('/api/admin/caller/createCaller').send({
			adminCode: 'adminPassword',
			area: areaId,
			phone: '+33223456780',
			pinCode: '1234',
			name: 'caller'
		});
		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty('message', 'caller already exist');
	});

	it('should return 200 if all parameters are correct', async () => {
		const res = await request(app).post('/api/admin/caller/createCaller').send({
			adminCode: 'adminPassword',
			area: areaId,
			phone: '+33223456781',
			pinCode: '1234',
			name: 'caller'
		});
		expect(res.status).toBe(200);
		expect(res.body).toHaveProperty('message', 'Caller caller (+33223456781) created');
	});
});
