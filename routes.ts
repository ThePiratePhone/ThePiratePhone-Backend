import { Router } from 'express';
import getArea from './router/getArea';
import createClients from './router/admin/client/createClients';
import createCaller from './router/caller/createCaller';
import ChangeName from './router/caller/changeName';
import changePassword from './router/caller/changePassword';
import endCall from './router/caller/endCall';

const router = Router();
const aspirationDetector = new Map<String, number>();
const resetPassword = new Map<String, { date: Date; password: String; try: number }>();

router.get('/getArea', getArea);

//admin/client
router.post('/admin/client/createClients', createClients);

//caller
router.post('/caller/createCaller', createCaller);
router.post('/caller/changeName', ChangeName);
router.post('/caller/changePassword', changePassword);
router.post('/caller/endCall', endCall);
export default router;
