import dotenv from 'dotenv';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../index';
import { Area } from '../../Models/Area';
import { Caller } from '../../Models/Caller';

dotenv.config({ path: '.env' });
let areaId: mongoose.Types.ObjectId | undefined;
beforeAll(async () => {
	await mongoose.connect(process.env.URITEST ?? '');
	await Caller.deleteMany({});
	await Area.deleteMany({});
	await Area.create({
		name: 'changepassordtest',
		password: 'password',
		campaignList: [],
		adminPassword: 'adminPassword'
	});
	areaId = (await Area.findOne({ name: 'changepassordtest' }))?._id;
});

afterAll(async () => {
	await mongoose.connection.close();
});

describe('post on /caller/createCaller', () => {
	it('Should return 400 if pin code is invalid', async () => {
		const res = await request(app).post('/api/caller/createCaller').send({
			phone: '0712345678',
			pinCode: '123',
			newName: 'newName',
			area: areaId,
			AreaPassword: 'password',
			CallerName: 'name'
		});
		expect(res.status).toBe(400);
		expect(res.body).toEqual({ message: 'Invalid pin code', OK: false });
	});

	it('Should return 400 if pin code is invalid', async () => {
		const res = await request(app).post('/api/caller/createCaller').send({
			phone: '071234567',
			pinCode: 'abcd',
			newName: 'newName',
			area: areaId,
			AreaPassword: 'password',
			CallerName: 'name'
		});
		expect(res.status).toBe(400);
		expect(res.body).toEqual({ message: 'Invalid pin code', OK: false });
	});

	it('Should return 400 if phone number is wrong', async () => {
		const res = await request(app).post('/api/caller/createCaller').send({
			phone: '071234567',
			pinCode: '1234',
			area: areaId,
			AreaPassword: 'password',
			CallerName: 'name'
		});
		expect(res.status).toBe(400);
		expect(res.body).toEqual({ message: 'Wrong phone number', OK: false });
	});

	it('Should return 404 if area not found', async () => {
		const res = await request(app).post('/api/caller/createCaller').send({
			phone: '0712345678',
			pinCode: '1234',
			area: areaId,
			AreaPassword: 'notpassword',
			CallerName: 'name'
		});
		expect(res.status).toBe(404);
		expect(res.body).toEqual({ message: 'area not found or invalid password', OK: false });
	});

	it('Should return 409 if caller already exist', async () => {
		await Caller.create({
			phone: '+33712345678',
			pinCode: '1234',
			name: 'name',
			area: areaId
		});
		const res = await request(app).post('/api/caller/createCaller').send({
			phone: '0712345678',
			pinCode: '1234',
			area: areaId,
			AreaPassword: 'password',
			CallerName: 'name'
		});
		expect(res.status).toBe(409);
		expect(res.body).toEqual({ message: 'caller already exist', OK: false });
	});

	it('Should return 200 if caller is created', async () => {
		const res = await request(app).post('/api/caller/createCaller').send({
			phone: '0712345679',
			pinCode: '1234',
			area: areaId,
			AreaPassword: 'password',
			CallerName: 'name'
		});
		expect(res.status).toBe(200);
		expect(res.body).toEqual({ message: 'Caller created', OK: true });
	});

	it('the caller should be in the database', async () => {
		const caller = await Caller.findOne({ phone: '+33712345679' });
		expect(caller?.name).toBe('name');
	});
});
