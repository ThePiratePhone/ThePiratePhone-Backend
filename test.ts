import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Client } from './Models/Client';
import { Area } from './Models/area';
dotenv.config({ path: '.env' });
mongoose
	.connect(process.env.URI ?? '')
	.then(() => {
		console.log('Successfully connected to MongoDB', 'INFORMATION', 'index.ts');
	})
	.catch(error => {
		console.log('Error connecting to MongoDB: ' + error, 'CRITICAL', 'index.ts');
	});

function generateRandomNumber(): number {
	return Math.floor(Math.random() * (999999999 - 100000000 + 1)) + 100000000;
}

for (let i = 0; i < 100; i++) {
	const client = new Client({
		name: 'Client ' + i,
		phone: '+33' + generateRandomNumber(),
		area: '65a84e49e385cbb21ffdbe4f',
		data: new Map()
	});
	client.save().then(() => {
		Area.updateOne({ _id: '65a84e49e385cbb21ffdbe4f' }, { $push: { clientList: client._id } })
			.then(() => {
				console.log('Client ' + i + ' created');
			})
			.catch(error => {
				console.log('Error: ' + error);
			});
	});
}
console.log('Done');
