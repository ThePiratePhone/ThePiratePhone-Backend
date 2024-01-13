import { Router } from 'express';
import NewCampaigns from './routerFunction/newCampaigns';

const router = Router();

router.post('/NewCampaign', NewCampaigns);

export default router;
