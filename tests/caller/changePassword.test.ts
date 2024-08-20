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

describe('post on /caller/chagePassword', () => {
	it('Should return 400 if pin code is invalid', async () => {
		const res = await request(app).post('/api/caller/changePassword').send({
			phone: '0712345678',
			pinCode: '123',
			newPin: '1234',
			area: areaId
		});
		expect(res.status).toBe(400);
		expect(res.body).toEqual({ message: 'Invalid pin code', OK: false });
	});

	it('Should return 400 if pin code is invalid', async () => {
		const res = await request(app).post('/api/caller/changePassword').send({
			phone: '0712345678',
			pinCode: 'abcd',
			newPin: '1234',
			area: areaId
		});
		expect(res.status).toBe(400);
		expect(res.body).toEqual({ message: 'Invalid pin code', OK: false });
	});

	it('Should return 403 if caller dont exist', async () => {
		const res = await request(app).post('/api/caller/changePassword').send({
			phone: '0712345678',
			pinCode: '1234',
			newPin: '1234',
			area: areaId
		});
		expect(res.status).toBe(403);
		expect(res.body).toEqual({ message: 'Invalid credential', OK: false });
	});

	it('Should return 400 if new pin code is not 4 digit', async () => {
		await Caller.create({
			phone: '+33712345678',
			pinCode: '1234',
			name: 'name',
			area: areaId
		});
		const res = await request(app).post('/api/caller/changePassword').send({
			phone: '0712345678',
			pinCode: '1234',
			newPin: '123',
			area: areaId
		});
		expect(res.status).toBe(400);
		expect(res.body).toEqual({ message: 'Invalid new pin code', OK: false });
	});

	it('Should return 400 if new pin code is not valid', async () => {
		await Caller.create({
			phone: '+33712345679',
			pinCode: '1234',
			name: 'name',
			area: areaId
		});
		const res = await request(app).post('/api/caller/changePassword').send({
			phone: '0712345679',
			pinCode: '1234',
			newPin: 'ABCD',
			area: areaId
		});
		expect(res.status).toBe(400);
		expect(res.body).toEqual({ message: 'Invalid new pin code', OK: false });
	});

	it('Should return 200 if user is found', async () => {
		await Caller.create({
			phone: '+33712345681',
			pinCode: '1234',
			name: 'name',
			area: areaId
		});
		const res = await request(app).post('/api/caller/changePassword').send({
			phone: '0712345681',
			pinCode: '1234',
			newPin: '1234',
			area: areaId
		});
		expect(res.status).toBe(200);
		expect(res.body).toEqual({ message: 'password changed', OK: true });
	});

	it('user password should be changed', async () => {
		const caller = await Caller.findOne({ phone: '+33712345681' });
		expect(caller?.pinCode).toBe('1234');
	});
});
