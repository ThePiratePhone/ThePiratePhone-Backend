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
		const res = await request(app).post('/caller/changeName');
		expect(res.status).toBe(400);
		expect(res.body).toEqual({ message: 'Missing parameters body is empty', OK: false });
	});

	it('Should return 400 if one params is missing', async () => {
		const res = await request(app).post('/caller/changeName').send({ phone: '1234567890' });
		expect(res.status).toBe(400);
		expect(res.body).toEqual({ message: 'Missing parameters (pinCode:string)', OK: false });
	});

	it('Should return 400 if one params have bad type', async () => {
		const res = await request(app)
			.post('/caller/changeName')
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
		const res = await request(app).post('/caller/changeName').send({
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
		const res = await request(app).post('/caller/changeName').send({
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

	it('sould dont work with bat type for optional parameter', async () => {
		const res = await request(app)
			.post('/caller/endCall')
			.send({
				phone: '1234567890',
				pinCode: '123',
				timeInCall: 1000,
				satisfaction: 'good',
				status: true,
				area: new ObjectId('66c37d5c34a15c96c5728746'),
				comment: 123
			});
		expect(res.status).toBe(400);
		expect(res.body).toEqual({
			message: 'Wrong type for parameter (comment is type: number but required type is string)',
			OK: false
		});
	});

	it('sould work with optional parameter', async () => {
		const res = await request(app)
			.post('/caller/endCall')
			.send({
				phone: '1234567890',
				pinCode: '123',
				timeInCall: 1000,
				satisfaction: 'good',
				status: true,
				area: new ObjectId('66c37d5c34a15c96c5728746'),
				comment: '123'
			});
		expect(res.status).toBe(400);
		expect(res.body).toEqual({ message: 'Invalid pin code', OK: false });
	});

	it('should work with no optional parameter', async () => {
		const res = await request(app)
			.post('/caller/endCall')
			.send({
				phone: '1234567890',
				pinCode: '123',
				timeInCall: 1000,
				satisfaction: 'good',
				status: true,
				area: new ObjectId('66c37d5c34a15c96c5728746')
			});
		expect(res.status).toBe(400);
		expect(res.body).toEqual({ message: 'Invalid pin code', OK: false });
	});

	it('should work if all parameters are given', async () => {
		const res = await request(app)
			.post('/caller/changeName')
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

describe('checkPinCode', () => {
	it('should return 400 if pin code is to short', async () => {
		const res = await request(app)
			.post('/caller/changeName')
			.send({
				phone: '1234567890',
				pinCode: '123',
				area: new ObjectId('66c37d5c34a15c96c5728746'),
				newName: 'newName'
			});
		expect(res.status).toBe(400);
		expect(res.body).toEqual({ message: 'Invalid pin code', OK: false });
	});

	it('should return 400 if pin code is not a number', async () => {
		const res = await request(app)
			.post('/caller/changeName')
			.send({
				phone: '1234567890',
				pinCode: 'abcd',
				area: new ObjectId('66c37d5c34a15c96c5728746'),
				newName: 'newName'
			});
		expect(res.status).toBe(400);
		expect(res.body).toEqual({ message: 'Invalid pin code', OK: false });
	});

	it('should work if pincode is ok', async () => {
		const res = await request(app)
			.post('/caller/changeName')
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
