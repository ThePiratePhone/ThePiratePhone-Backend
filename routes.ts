import { Router } from 'express';
import CreateClient from './router/CreateClient';
import CreateCampaign from './router/CreateCampaing';
import addClientCampaing from './router/addClientCampaing';
import addCallerCampaing from './router/addCallerCampaing';
import CreateCaller from './router/CreateCaller';

const router = Router();

router.get('/createClient', CreateClient);
router.get('/CreateCaller', CreateCaller);
router.get('/createCampaing', CreateCampaign);
router.get('/addClientCampaing', addClientCampaing);
router.get('/addCallerCampaing', addCallerCampaing);

export default router;
