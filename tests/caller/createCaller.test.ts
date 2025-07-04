import dotenv from 'dotenv';
import mongoose from 'mongoose';
import request from 'supertest';

import app from '../../index';
import { Caller } from '../../Models/Caller';
import { Campaign } from '../../Models/Campaign';

dotenv.config({ path: '.env' });
let areaId: mongoose.Types.ObjectId | undefined;
beforeAll(async () => {
	await mongoose.connect(process.env.URITEST ?? '');
	await Caller.deleteMany({});
	await Campaign.deleteMany({});
});

afterAll(async () => {
	await mongoose.connection.close();
});

describe('post on /caller/createCaller', () => {
	it('Should return 400 if pin code is invalid', async () => {
		const res = await request(app).post('/caller/createCaller').send({
			phone: '+33912345678',
			pinCode: '123',
			newName: 'newName',
			CallerName: 'name',
			campaignPassword: 'password'
		});
		expect(res.status).toBe(400);
		expect(res.body).toEqual({ message: 'Invalid pin code', OK: false });
	});

	it('Should return 400 if pin code is invalid', async () => {
		const res = await request(app).post('/caller/createCaller').send({
			phone: '+33912345678',
			pinCode: 'abcd',
			newName: 'newName',
			CallerName: 'name',
			campaignPassword: 'password'
		});
		expect(res.status).toBe(400);
		expect(res.body).toEqual({ message: 'Invalid pin code', OK: false });
	});

	it('Should return 400 if phone number is wrong', async () => {
		const res = await request(app).post('/caller/createCaller').send({
			phone: '+3391234567',
			pinCode: '1234',
			CallerName: 'name',
			campaignPassword: 'password'
		});
		expect(res.status).toBe(400);
		expect(res.body).toEqual({ message: 'Wrong phone number', OK: false });
	});

	it('Should return 409 if caller already exist', async () => {
		const campaignid = (
			await Campaign.create({
				name: 'Test Campaign',
				password: 'password',
				active: true,
				area: areaId ?? new mongoose.Types.ObjectId()
			})
		)._id;

		await Caller.create({
			phone: '+33912345678',
			pinCode: '1234',
			name: 'name',
			campaigns: [campaignid]
		});

		const res = await request(app).post('/caller/createCaller').send({
			phone: '+33912345678',
			pinCode: '1234',
			CallerName: 'name',
			campaignPassword: 'password'
		});
		expect(res.status).toBe(409);
		expect(res.body).toEqual({ message: 'caller already exist', OK: false });
	});
});
describe('post on /caller/createCaller with valid data', () => {
	let campaignid: mongoose.Types.ObjectId;
	beforeAll(async () => {
		campaignid = (
			await Campaign.create({
				name: 'Test Campaign',
				password: 'password2',
				active: true,
				area: new mongoose.Types.ObjectId()
			})
		)._id;
	});

	it('Should return 200 if caller is created', async () => {
		const res = await request(app).post('/caller/createCaller').send({
			phone: '+33912345679',
			pinCode: '1234',
			CallerName: 'name',
			campaignPassword: 'password2'
		});
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ message: 'Caller created', OK: true });
	});

	it('the caller should be in the database', async () => {
		const caller = await Caller.findOne({ phone: '+33912345679' });
		expect(caller?.name).toBe('name');
		expect(caller?.campaigns).toEqual([campaignid]);
	});
});
