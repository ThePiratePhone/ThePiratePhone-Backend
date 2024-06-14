import { Router } from 'express';
import getArea from './router/getArea';
import createClients from './router/admin/client/createClients';
import createCaller from './router/caller/createCaller';
import ChangeClientName from './router/caller/changeName';
import changePassword from './router/caller/changePassword';
import endCall from './router/caller/endCall';
import getPhoneNumber from './router/caller/getPhoneNumber';
import login from './router/caller/login';
import validateCall from './router/caller/validateCall';
import joinCampaign from './router/caller/joinCampaign';
import giveUp from './router/caller/giveUp';
import getProgress from './router/caller/getProgress';
import ChangeAreaName from './router/admin/area/changeName';

const router = Router();

//caller
router.post('/caller/changePassword', changePassword);
router.post('/caller/createCaller', createCaller);
router.post('/caller/endCall', endCall);
router.post('/caller/getPhoneNumber', getPhoneNumber);
router.post('/caller/getProgress', getProgress);
router.post('/caller/giveUp', giveUp);
router.post('/caller/joinCampaign', joinCampaign);
router.post('/caller/login', login);
router.post('/caller/validateCall', validateCall);
router.post('/caller/changeName', ChangeClientName);

//admin/client
router.post('/admin/client/createClients', createClients);

//admin/area
router.post('/admin/area/changeName', ChangeAreaName);

router.get('/getArea', getArea);
export default router;
