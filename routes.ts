import { Router } from 'express';

import ChangeAdminPassword from './router/admin/area/changeAdminPassword';
import ChangeAreaName from './router/admin/area/changeName';
import callerInfo from './router/admin/caller/callerInfo';
import changeCallerPassword from './router/admin/caller/changeCallerPassword';
import ChangeName from './router/admin/caller/changeName';
import createClients from './router/admin/client/createClients';
import ChangeClientName from './router/caller/changeName';
import changePassword from './router/caller/changePassword';
import createCaller from './router/caller/createCaller';
import endCall from './router/caller/endCall';
import getPhoneNumber from './router/caller/getPhoneNumber';
import getProgress from './router/caller/getProgress';
import giveUp from './router/caller/giveUp';
import joinCampaign from './router/caller/joinCampaign';
import login from './router/caller/login';
import validateCall from './router/caller/validateCall';
import getArea from './router/getArea';
import OtherCallerInfo from './router/otherCaller/OtherCallerInfo';
import scoreBoard from './router/otherCaller/scoreBoard';

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

//other caller
router.post('/otherCaller/scoreBoard', scoreBoard);
router.post('/otherCaller/info', OtherCallerInfo);

//admin/client
router.post('/admin/client/createClients', createClients);

//admin/area
router.post('/admin/area/changeName', ChangeAreaName);
router.post('/admin/area/changeAdminPassword', ChangeAdminPassword);
router.post('/admin/area/changePassword', changePassword);

//admin/caller
router.post('/admin/caller/callerInfo', callerInfo);
router.post('/admin/caller/changePassword', changeCallerPassword);
router.post('/admin/caller/changeName', ChangeName);

router.get('/getArea', getArea);
export default router;
