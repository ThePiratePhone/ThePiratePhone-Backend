import { Router } from 'express';
import getArea from './router/getArea';
import createClients from './router/admin/client/createClients';

const router = Router();
const aspirationDetector = new Map<String, number>();
const resetPassword = new Map<String, { date: Date; password: String; try: number }>();

router.get('/getArea', getArea);

//admin/client
router.post('/admin/client/createClients', createClients);

export default router;
