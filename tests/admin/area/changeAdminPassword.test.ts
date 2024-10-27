import dotenv from 'dotenv';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../../index';
import { Area } from '../../../Models/Area';
dotenv.config({ path: '.env' });
let areaId: mongoose.Types.ObjectId | undefined;
beforeAll(async () => {
	await mongoose.connect(process.env.URITEST ?? '');
	await Area.deleteMany({});

	areaId = (
		await Area.create({
			name: 'changepassordtest',
			password: 'password',
			campaignList: [],
			adminPassword: 'adminPassword'
		})
	).id;
});

afterAll(async () => {
	await mongoose.connection.close();
});

describe('post on /api/admin/area/changeAdminPassword', () => {
	it('should return 400 if bad new admin password', async () => {
		const res = await request(app).post('/api/admin/area/changeAdminPassword').send({
			adminCode: 'adminPassword',
			area: areaId,
			newPassword: ' '
		});
		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty('message', 'bad new admin password');
	});

	it('should return 404 if no area found', async () => {
		const res = await request(app).post('/api/admin/area/changeAdminPassword').send({
			adminCode: 'adminPassword',
			area: new mongoose.Types.ObjectId(),
			newPassword: 'newPassword'
		});
		expect(res.status).toBe(404);
		expect(res.body).toHaveProperty('message', 'no area found');
	});

	it('should return 400 if new password is too long', async () => {
		const res = await request(app)
			.post('/api/admin/area/changeAdminPassword')
			.send({
				adminCode: 'adminPassword',
				area: areaId,
				newPassword: 'a'.repeat(513)
			});
		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty('message', 'new password is too long (max 512)');
	});

	it('should return 400 if new password is not a hash', async () => {
		const res = await request(app).post('/api/admin/area/changeAdminPassword').send({
			adminCode: 'adminPassword',
			area: areaId,
			newPassword: '5c29a959abce4eda5f0e7a4e7ea53dce4fa0f0abbe8eaa63717e2fed5f193d3/',
			allreadyHased: true
		});
		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty('message', 'new password is not a hash');
	});

	it('should return 200 if OK', async () => {
		const res = await request(app).post('/api/admin/area/changeAdminPassword').send({
			adminCode: 'adminPassword',
			area: areaId,
			newPassword: 'newPassword'
		});
		expect(res.status).toBe(200);
		expect(res.body).toHaveProperty('message', 'password of area changed');
		const areaNewPassword = (await Area.findById(areaId))?.adminPassword;
		expect(areaNewPassword).toBe('5c29a959abce4eda5f0e7a4e7ea53dce4fa0f0abbe8eaa63717e2fed5f193d31');
	});

	it('should return 200 if OK with hash', async () => {
		//the fist area is consumed by the last test
		const areaId2 = (
			await Area.create({
				name: 'changepassordtest2',
				password: 'password',
				campaignList: [],
				adminPassword: 'adminPassword2'
			})
		).id;
		const res = await request(app).post('/api/admin/area/changeAdminPassword').send({
			adminCode: 'adminPassword2',
			area: areaId2,
			newPassword: '5c29a959abce4eda5f0e7a4e7ea53dce4fa0f0abbe8eaa63717e2fed5f193d31',
			allreadyHased: true
		});
		expect(res.status).toBe(200);
		expect(res.body).toHaveProperty('message', 'password of area changed');
		const areaNewPassword = (await Area.findById(areaId))?.adminPassword;
		expect(areaNewPassword).toBe('5c29a959abce4eda5f0e7a4e7ea53dce4fa0f0abbe8eaa63717e2fed5f193d31');
	});
});
