import dotenv from 'dotenv';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../../index';
import { Area } from '../../../Models/Area';
import { Caller } from '../../../Models/Caller';

dotenv.config({ path: '.env' });
let areaId: mongoose.Types.ObjectId | undefined;
beforeAll(async () => {
	await mongoose.connect(process.env.URITEST ?? '');
	await Caller.deleteMany({});
	await Area.deleteMany({});

	areaId = (
		await Area.create({
			name: 'changepassordtest',
			password: 'password',
			campaignList: [],
			adminPassword: 'adminPassword'
		})
	)._id;
	await Caller.create({
		name: 'changepassordtest',
		phone: '+33234567890',
		pinCode: '1234',
		area: areaId,
		campaigns: []
	});
});

afterAll(async () => {
	await mongoose.connection.close();
});

describe('post on /api/admin/caller/changePassword', () => {
	it('should return 400 if new pin code is not a number', async () => {
		const response = await request(app).post('/api/admin/caller/changePassword').send({
			adminCode: 'adminPassword',
			newPassword: 'a123',
			Callerphone: '+33234567890',
			area: areaId
		});
		expect(response.status).toBe(400);
		expect(response.body).toMatchObject({ message: 'Invalid new pin code', OK: false });
	});

	it('should return 400 if new pin code is not 4 digits', async () => {
		const response = await request(app).post('/api/admin/caller/changePassword').send({
			adminCode: 'adminPassword',
			newPassword: '12345',
			Callerphone: '+33234567890',
			area: areaId
		});
		expect(response.status).toBe(400);
		expect(response.body).toMatchObject({ message: 'Invalid new pin code', OK: false });
	});

	it('should return 401 if admin code is wrong', async () => {
		const response = await request(app).post('/api/admin/caller/changePassword').send({
			adminCode: 'wrongAdminPassword',
			newPassword: '1234',
			Callerphone: '+33234567890',
			area: areaId
		});
		expect(response.status).toBe(401);
		expect(response.body).toMatchObject({ message: 'Wrong admin code', OK: false });
	});

	it('should return 404 if caller not found', async () => {
		const response = await request(app).post('/api/admin/caller/changePassword').send({
			adminCode: 'adminPassword',
			newPassword: '1234',
			Callerphone: '+33234567891',
			area: areaId
		});
		expect(response.status).toBe(404);
		expect(response.body).toMatchObject({ message: 'Caller not found or same password', OK: false });
	});

	it('should return 200 if password changed', async () => {
		const response = await request(app).post('/api/admin/caller/changePassword').send({
			adminCode: 'adminPassword',
			newPassword: '1235',
			Callerphone: '+33234567890',
			area: areaId
		});
		expect(response.status).toBe(200);
		expect(response.body).toMatchObject({ message: 'Password changed', OK: true });
		const newPassword = (await Caller.findOne({ phone: '+33234567890' }, ['pinCode']))?.pinCode;
		expect(newPassword).toBe('1235');
	});
});
