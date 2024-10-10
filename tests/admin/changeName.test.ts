import dotenv from 'dotenv';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../index';
import { Area } from '../../Models/Area';
import { Caller } from '../../Models/Caller';
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
	callerId = (
		await Caller.create({
			name: 'changepassordtest',
			phone: '+33134567890',
			pinCode: '1234',
			area: areaId,
			campaigns: []
		})
	)?.id;
});

afterAll(async () => {
	await mongoose.connection.close();
});

describe('post on /api/admin/caller/changeName', () => {
	it('should return 400 if newName is empty', async () => {
		const response = await request(app).post('/api/admin/caller/changeName').send({
			adminCode: 'adminPassword',
			newName: '',
			phone: '+33134567890',
			area: areaId
		});
		expect(response.status).toBe(400);
		expect(response.body).toMatchObject({ message: 'Wrong newName', OK: false });
	});

	it('should return 401 if admin code is wrong', async () => {
		const response = await request(app).post('/api/admin/caller/changeName').send({
			adminCode: 'wrongAdminPassword',
			newName: 'newName',
			phone: '+33134567890',
			area: areaId
		});
		expect(response.status).toBe(401);
		expect(response.body).toMatchObject({ message: 'Wrong admin code', OK: false });
	});

	it('should return 400 if caller not found', async () => {
		const response = await request(app).post('/api/admin/caller/changeName').send({
			adminCode: 'adminPassword',
			newName: 'newName',
			phone: '+33134567891',
			area: areaId
		});
		expect(response.status).toBe(400);
		expect(response.body).toMatchObject({ message: 'Caller not found', OK: false });
	});

	it('should return 200 if all parameters are correct', async () => {
		const response = await request(app).post('/api/admin/caller/changeName').send({
			adminCode: 'adminPassword',
			newName: 'newName',
			phone: '+33134567890',
			area: areaId
		});
		expect(response.status).toBe(200);
		expect(response.body).toMatchObject({ message: 'Caller name changed', OK: true });
	});
});
