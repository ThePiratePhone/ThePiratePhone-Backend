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
	await Area.create({ name: 'area', password: 'password', campaignList: [], adminPassword: 'adminPassword' });
	areaId = (await Area.findOne({ name: 'area' }))?._id;
});

afterAll(async () => {
	await mongoose.connection.close();
});

describe('post on /api/caller/changeName', () => {
	it('Should return 400 if new name is empty', async () => {
		const res = await request(app).post('/api/caller/changeName').send({
			phone: '0712345678',
			pinCode: '1234',
			newName: ' ',
			area: areaId
		});
		expect(res.status).toBe(400);
		expect(res.body).toEqual({ message: 'Wrong newName', OK: false });
	});

	it('Should return 400 if pin code is invalid', async () => {
		const res = await request(app).post('/api/caller/changeName').send({
			phone: '0712345678',
			pinCode: '123',
			newName: 'newName',
			area: areaId
		});
		expect(res.status).toBe(400);
		expect(res.body).toEqual({ message: 'Invalid pin code', OK: false });
	});

	it('Should return 400 if pin code is invalid', async () => {
		const res = await request(app).post('/api/caller/changeName').send({
			phone: '071234567',
			pinCode: 'abcd',
			newName: 'newName',
			area: areaId
		});
		expect(res.status).toBe(400);
		expect(res.body).toEqual({ message: 'Invalid pin code', OK: false });
	});

	it('Should return 400 if caller dont exist', async () => {
		const res = await request(app).post('/api/caller/changeName').send({
			phone: '0712345678',
			pinCode: '1234',
			newName: 'newName',
			area: areaId
		});
		expect(res.status).toBe(400);
		expect(res.body).toEqual({ message: 'Caller not found', OK: false });
	});

	it('Should return 200 if user is found', async () => {
		await Caller.create({
			phone: '+33712345678',
			pinCode: '1234',
			name: 'name',
			area: areaId
		});
		const res = await request(app).post('/api/caller/changeName').send({
			phone: '0712345678',
			pinCode: '1234',
			newName: 'newName',
			area: areaId
		});
		expect(res.status).toBe(200);
		expect(res.body).toEqual({ message: 'Caller name changed', OK: true });
	});

	it('user name should be changed', async () => {
		const caller = await Caller.findOne({ phone: '+33712345678' });
		expect(caller?.name).toBe('newName');
	});
});
