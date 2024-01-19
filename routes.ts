import { Router } from 'express';

import addCallerCampaign from './router/addCallerCampaign';
import addClientCampaign from './router/addClientCampaign';
import getProgress from './router/getProgress';
import createClient from './router/createClient';
import createCaller from './router/createCaller';
import createCampaign from './router/createCampaign';
import getArea from './router/getArea';

const router = Router();

router.post('/createClient', createClient);
router.post('/CreateCaller', createCaller);
router.post('/createCampaign', createCampaign);
router.post('/addClientCampaign', addClientCampaign);
router.post('/addCallerCampaign', addCallerCampaign);
router.post('/getProgress', getProgress);
router.get('/getArea', getArea);
export default router;
