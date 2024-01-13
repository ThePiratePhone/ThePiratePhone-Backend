import { Router } from 'express';
import NewCampaigns from './routerFunction/newCampaigns';
import NewClient from './routerFunction/newClient';

const router = Router();

router.post('/NewCampaign', NewCampaigns);
router.post('/NewClient', NewClient);

export default router;
