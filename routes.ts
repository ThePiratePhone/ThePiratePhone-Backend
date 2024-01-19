import { Router } from 'express';

import addCallerCampaign from './router/addCallerCampaign';
import addClientCampaign from './router/addClientCampaign';
import createCaller from './router/createCaller';
import createCampaign from './router/createCampaign';
import createClient from './router/createClient';
import getArea from './router/getArea';
import getProgress from './router/getProgress';
import login from './router/login';

const router = Router();

router.post('/createClient', createClient);
router.post('/createCaller', createCaller);
router.post('/createCampaign', createCampaign);
router.post('/addClientCampaign', addClientCampaign);
router.post('/addCallerCampaign', addCallerCampaign);
router.post('/getProgress', getProgress);
router.post('/login', login);
router.get('/getArea', getArea);
export default router;
