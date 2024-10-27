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

describe('post on /api/admin/caller/searchByName', () => {
	it('should return 401 if wrong admin code', async () => {
		const res = await request(app).post('/api/admin/caller/searchByName').send({
			adminCode: 'wrongAdminCode',
			area: areaId,
			name: 'name'
		});
		expect(res.status).toBe(401);
		expect(res.body).toHaveProperty('message', 'Wrong admin code');
	});

	it('should return 200 if OK', async () => {
		await Caller.create({
			name: 'name',
			phone: '+33323456780',
			area: areaId,
			pinCode: '1234'
		});
		await Caller.create({
			name: 'name1',
			phone: '+33323456781',
			area: areaId,
			pinCode: '1234'
		});
		await Caller.create({
			name: 'chose',
			phone: '+33323456782',
			area: areaId,
			pinCode: '1234'
		});

		const res = await request(app).post('/api/admin/caller/searchByName').send({
			adminCode: 'adminPassword',
			area: areaId,
			name: 'name'
		});
		expect(res.status).toBe(200);
		expect(res.body).toHaveProperty('OK', true);
		expect(res.body).toHaveProperty('data');
		expect(res.body.data).toHaveLength(2);
		expect(res.body.data[0]).toHaveProperty('name', 'name');
		expect(res.body.data[1]).toHaveProperty('name', 'name1');

		const res2 = await request(app).post('/api/admin/caller/searchByName').send({
			adminCode: 'adminPassword',
			area: areaId,
			name: 'chose'
		});
		expect(res2.status).toBe(200);
		expect(res2.body).toHaveProperty('OK', true);
		expect(res2.body).toHaveProperty('data');
		expect(res2.body.data).toHaveLength(1);
		expect(res2.body.data[0]).toHaveProperty('name', 'chose');
	});
});
