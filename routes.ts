import { Router } from 'express';

import addCallerCampaing from './router/addCallerCampaing';
import addClientCampaing from './router/addClientCampaing';
import getProgress from './router/getProgress';
import createClient from './router/createClient';
import createCaller from './router/createCaller';
import createCampaign from './router/createCampaing';

const router = Router();

router.get('/createClient', createClient);
router.get('/CreateCaller', createCaller);
router.get('/createCampaing', createCampaign);
router.get('/addClientCampaing', addClientCampaing);
router.get('/addCallerCampaing', addCallerCampaing);
router.get('/getProgress', getProgress);
export default router;
