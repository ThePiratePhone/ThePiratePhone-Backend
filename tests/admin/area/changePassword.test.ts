import dotenv from 'dotenv';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../../index';
import { Area } from '../../../Models/Area';
dotenv.config({ path: '.env' });
let areaId: mongoose.Types.ObjectId | undefined;
const adminPassword =
	'b109f3bbbc244eb82441917ed06d618b9008dd09b3befd1b5e07394c706a8bb980b1d7785e5976ec049b46df5f1326af5a2ea6d103fd07c95385ffab0cacbc86'; //password
beforeAll(async () => {
	await mongoose.connect(process.env.URITEST ?? '');
	await Area.deleteMany({});

	areaId = (
		await Area.create({
			name: 'changepassordtest',
			password: 'password',
			campaignList: [],
			adminPassword: adminPassword
		})
	).id;
});

afterAll(async () => {
	await mongoose.connection.close();
});

describe('post on /api/admin/area/changePassword', () => {
	it('should return 400 if bad new password', async () => {
		const res = await request(app).post('/api/admin/area/changePassword').send({
			adminCode: adminPassword,
			area: areaId,
			newPassword: ' ',
			allreadyHased: true
		});
		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty('message', 'bad new password');
	});

	it('should return 404 if no area found', async () => {
		const res = await request(app).post('/api/admin/area/changePassword').send({
			adminCode: adminPassword,
			area: new mongoose.Types.ObjectId(),
			newPassword: 'newPassword',
			allreadyHased: true
		});
		expect(res.status).toBe(404);
		expect(res.body).toHaveProperty('message', 'no area found');
	});

	it('should return 400 if new password is too long', async () => {
		const res = await request(app)
			.post('/api/admin/area/changePassword')
			.send({
				adminCode: adminPassword,
				area: areaId,
				newPassword: 'a'.repeat(33),
				allreadyHased: true
			});
		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty('message', 'new password is too long (max 32)');
	});

	it('should return 200 if password of area changed', async () => {
		const res = await request(app).post('/api/admin/area/changePassword').send({
			adminCode: 'password',
			area: areaId,
			newPassword: 'newPassword'
		});
		expect(res.status).toBe(200);
		expect(res.body).toHaveProperty('message', 'password of area changed');
	});

	it('should return 200 if password of area changed with hash', async () => {
		const res = await request(app).post('/api/admin/area/changePassword').send({
			adminCode: adminPassword,
			area: areaId,
			newPassword: 'newPassword',
			allreadyHased: true
		});
		expect(res.status).toBe(200);
		expect(res.body).toHaveProperty('message', 'password of area changed');
	});
});
