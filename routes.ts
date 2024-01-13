import { Router } from 'express';
import NewCampaigns from './routerFunction/newCampaigns';
import NewClient from './routerFunction/newClient';
import NewCaller from './routerFunction/newCaller';

const router = Router();

router.post('/NewCampaign', NewCampaigns);
router.post('/NewClient', NewClient);
router.post('/NewCaller', NewCaller);

export default router;
