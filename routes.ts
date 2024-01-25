import { Router } from 'express';

import addCallerCampaign from './router/addCallerCampaign';
import addClientCampaign from './router/addClientCampaign';
import createCaller from './router/createCaller';
import createCampaign from './router/createCampaign';
import createClient from './router/createClient';
import getArea from './router/getArea';
import getPhoneNumber from './router/getPhoneNumber';
import getProgress from './router/getProgress';
import login from './router/login';
import endCall from './router/endCall';
import clientBuster from './router/ClientBuster';
import { log } from './tools/log';

const router = Router();

try {
	router.post('/clientBuster', clientBuster);
	router.post('/createClient', createClient);
	router.post('/endCall', endCall);
	router.post('/createCaller', createCaller);
	router.post('/createCampaign', createCampaign);
	router.post('/addClientCampaign', addClientCampaign);
	router.post('/addCallerCampaign', addCallerCampaign);
	router.post('/getProgress', getProgress);
	router.post('/getPhoneNumber', getPhoneNumber);
	router.post('/login', login);
	router.get('/getArea', getArea);
} catch (e) {
	log('error in router: ' + e, 'CRITICAL', 'routes.ts');
}
export default router;
