import { Router } from 'express';
import CreateClient from './router/CreateClient';
import CreateCampaign from './router/CreateCampaign';

const router = Router();

router.get('/createClient', CreateClient);
router.get('/createCampaign', CreateCampaign);

export default router;
