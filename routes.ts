import { Router } from 'express';
import NewCampaigns from './routerFunction/newCampaigns';
import NewClient from './routerFunction/newClient';
import NewCaller from './routerFunction/newCaller';
import login from './routerFunction/Login';

const router = Router();

router.post('/NewCampaign', NewCampaigns);
router.post('/NewClient', NewClient);
router.post('/NewCaller', NewCaller);
router.post('/NewUser', NewClient);
router.post('/login', login);

export default router;
