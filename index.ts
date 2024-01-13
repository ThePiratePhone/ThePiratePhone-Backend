import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Log } from './tools/log';
import router from './routes';

dotenv.config();
const port = 7000;
let started = false;

function main() {
	if (started) {
		Log('index.ts', 'INFORMATION', 'Server already started');
		return;
	}
	started = true;

	// Connect to MongoDB using Mongoose
	mongoose
		.connect(process.env.URI ?? '')
		.then(() => {
			Log('Successfully connected to MongoDB', 'INFORMATION', 'index.ts');
		})
		.catch(error => {
			Log('Error connecting to MongoDB: ' + error, 'CRITICAL', 'index.ts');
		});

	// Create an instance of the Express app
	const app = express();
	app.use(express.json());
	app.use(cors());
	app.use('/api', router);

	// Start the Express app
	app.listen(port, () => {
		Log(`Listening at http://localhost:${port}`, 'DEBUG', 'index.ts');
	});

	app.get('/', (req, res) => {
		res.send({ message: 'Hello World!' });
	});
}

main();

export default main;
