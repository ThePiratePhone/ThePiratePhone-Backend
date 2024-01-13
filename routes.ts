import { Router } from 'express';
import NewCampaigns from './router/newCampaigns';
import NewClient from './router/newClient';
import NewCaller from './router/newCaller';
import login from './router/Login';
import addClientCampaign from './router/addClientCampagns';

const router = Router();

router.post('/NewCampaign', NewCampaigns);
router.post('/NewClient', NewClient);
router.post('/NewCaller', NewCaller);
router.post('/NewUser', NewClient);
router.post('/login', login);
router.post('/addClientcampaign', addClientCampaign);

export default router;
