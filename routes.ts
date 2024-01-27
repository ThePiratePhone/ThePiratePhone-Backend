import { Router } from 'express';

import addCallerCampaign from './router/admin/addCallerCampaign';
import addClientCampaign from './router/admin/addClientCampaign';
import createCaller from './router/admin/createCaller';
import createCampaign from './router/admin/createCampaign';
import createClient from './router/admin/createClient';
import getArea from './router/getArea';
import getPhoneNumber from './router/caller/getPhoneNumber';
import getProgress from './router/caller/getProgress';
import login from './router/caller/login';
import endCall from './router/caller/endCall';
import clientBuster from './router/caller/ClientBuster';
import { log } from './tools/log';
import listClientCampaign from './router/admin/listClientCampaign';
import listCaller from './router/admin/listCaller';
import listCallerCampaign from './router/admin/listCallerCampaign';

const router = Router();

try {
	router.post('/listCallerCampaign', listCallerCampaign);
	router.post('/listCaller', listCaller);
	router.post('listClientCampaign', listClientCampaign);
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
