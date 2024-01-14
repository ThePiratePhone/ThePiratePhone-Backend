import { Router } from 'express';
import CreateClient from './router/CreateClient';
import CreateCampaign from './router/CreateCampaign';
import addClientCampaing from './router/addClientCampaing';

const router = Router();

router.get('/createClient', CreateClient);
router.get('/createCampaign', CreateCampaign);
router.get('/addClientCampaing', addClientCampaing);

export default router;
