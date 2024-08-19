import dotenv from 'dotenv';
import { ObjectId } from 'mongodb';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../index';

dotenv.config({ path: '.env' });

beforeAll(async () => {
	await mongoose.connect(process.env.URITEST ?? '');
});

afterAll(async () => {
	await mongoose.connection.close();
});
describe('checkParameters', () => {
	it('Should return 400 if no params specify', async () => {
		const res = await request(app).post('/api/caller/changeName');
		expect(res.status).toBe(400);
		expect(res.body).toEqual({ message: 'Missing parameters body is empty', OK: false });
	});
	it('Should return 400 if one params is missing', async () => {
		const res = await request(app).post('/api/caller/changeName').send({ phone: '1234567890' });
		expect(res.status).toBe(400);
		expect(res.body).toEqual({ message: 'Missing parameters (pinCode:string)', OK: false });
	});
	it('Should return 400 if one params have bad type', async () => {
		const res = await request(app)
			.post('/api/caller/changeName')
			.send({
				phone: 1234567890,
				pinCode: '1234',
				area: new ObjectId('66c37d5c34a15c96c5728746'),
				newName: 'newName'
			});
		expect(res.status).toBe(400);
		expect(res.body).toEqual({
			message: 'Wrong type for parameter (phone is type: number but required type is string)',
			OK: false
		});
	});

	it('should return 400 if ObjectId params hase not object id', async () => {
		const res = await request(app).post('/api/caller/changeName').send({
			phone: '1234567890',
			pinCode: '1234',
			area: 'cccsddacdaa1ac96c572azer',
			newName: 'newName'
		});
		expect(res.status).toBe(400);
		expect(res.body).toEqual({
			message: 'Wrong type for parameter (area is type: string but required type is ObjectId)',
			OK: false
		});
	});

	it('should return 400 if ObjectId params have no 24char', async () => {
		const res = await request(app).post('/api/caller/changeName').send({
			phone: '1234567890',
			pinCode: '1234',
			area: 'sdfsdf',
			newName: 'newName'
		});
		expect(res.status).toBe(400);
		expect(res.body).toEqual({
			message: 'Wrong type for parameter (area is type: string but required type is ObjectId)',
			OK: false
		});
	});

	it('should work if all parameters are given', async () => {
		const res = await request(app)
			.post('/api/caller/changeName')
			.send({
				phone: '1234567890',
				pinCode: '1234',
				area: new ObjectId('66c37d5c34a15c96c5728746'),
				newName: 'newName'
			});
		expect(res.status).toBe(400);
		expect(res.body).toEqual({ message: 'Wrong phone number', OK: false });
	});
});
