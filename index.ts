import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';

import router from './routes';
import { log } from './tools/log';

dotenv.config({ path: '.env' });
const port = 8081;
// in test, the test script will create the connection to the database
if (process.env.JEST_WORKER_ID == undefined) {
	// Connect to MongoDB using Mongoose
	if (process.env.ISDEV == 'false') {
		mongoose
			.connect(process.env.URI ?? '')
			.then(() => {
				log(`Successfully connected to MongoDB`, 'DEBUG', 'index.ts');
			})
			.catch(error => {
				log(`Error connecting to MongoDB: ${error}`, 'CRITICAL', 'index.ts');
			});
	} else {
		mongoose
			.connect(process.env.URIDEV ?? '')
			.then(() => {
				log(`Successfully connected to MongoDB`, 'DEBUG', 'index.ts');
			})
			.catch(error => {
				log(`Error connecting to MongoDB: ${error}`, 'CRITICAL', 'index.ts');
			});
	}
}
// Create an instance of the Express app
const app = express();
if (process.env.ISDEV == 'false') {
	// set up rate limiter: maximum of 300 requests per minute
	app.use(
		rateLimit({
			windowMs: 60_000,
			max: 300,
			handler: (req, res, next, options) => {
				res.status(options.statusCode).send(options.message);
				log(`Too many requests (300/min) from: ${req.ip}`, 'CRITICAL', __filename);
			}
		})
	);
}
if (process.env.JEST_WORKER_ID == undefined) {
	app.listen(port, () => {
		log(`Listening at http://localhost:${port}`, 'DEBUG', __filename);
	});
}

app.use(express.json());
app.use(cors());
app.use((err: { status: number }, req: any, res: any, next: Function) => {
	if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
		return res.sendStatus(400);
	}
	next();
});

app.use(router);

export default app;
