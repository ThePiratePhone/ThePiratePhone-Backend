import { Router } from 'express';

import addCallerCampaign from './router/admin/addCallerCampaign';
import addClientCampaign from './router/admin/addClientCampaign';
import createCampaign from './router/admin/createCampaign';
import createClient from './router/admin/createClient';
import getArea from './router/getArea';
import getPhoneNumber from './router/caller/getPhoneNumber';
import getProgress from './router/caller/getProgress';
import login from './router/caller/login';
import endCall from './router/caller/endCall';
import listClientCampaign from './router/admin/listClientCampaign';
import listCaller from './router/admin/listCaller';
import listCallerCampaign from './router/admin/listCallerCampaign';
import numberOfCalls from './router/stats/numberOfCalls';
import numberOfCallers from './router/stats/numberOfCallers';
import numberOfClients from './router/stats/numberOfClients';
import callePerClient from './router/stats/callPerClient';
import validatePhoneNumber from './router/caller/validatePhoneNumber';
import joinCampaign from './router/caller/joinCampaign';
import changePassword from './router/caller/changePassword';
import createCallerByAdmin from './router/admin/createCallerByAdmin';
import createCaller from './router/caller/createCaller';
import exportClientCsv from './router/admin/exportClientCsv';
import chnageCallerPassword from './router/admin/chanageCallerPassword';
import exportCallerCsv from './router/admin/exportCallerCsv';
import loginAdmin from './router/admin/login';
import listCampaign from './router/admin/listCampaign';
import changePasswordAdmin from './router/admin/changePassword';
import giveUp from './router/caller/giveUp';
const router = Router();
//stats
router.post('/stats/callPerClient', callePerClient);
router.post('/stats/numberOfClients', numberOfClients);
router.post('/stats/numberOfCallers', numberOfCallers);
router.post('/stats/numberOfCalls', numberOfCalls);
//admin
router.post('/admin/changePassword', changePasswordAdmin);
router.post('/admin/login', loginAdmin);
router.post('/admin/exportCallerCsv', exportCallerCsv);
router.post('/admin/exportClientCsv', exportClientCsv);
router.post('/admin/listCallerCampaign', listCallerCampaign);
router.post('/admin/listCaller', listCaller);
router.post('/admin/Campaign', listCampaign);
router.post('/admin/listClientCampaign', listClientCampaign);
router.post('/admin/createCaller', createCallerByAdmin);
router.post('/admin/createCampaign', createCampaign);
router.post('/admin/addClientCampaign', addClientCampaign);
router.post('/admin/addCallerCampaign', addCallerCampaign);
router.post('/admin/changeCallerPassword', chnageCallerPassword);
//caller/
router.post('/giveUp', giveUp);
router.post('/createCaller', createCaller);
router.post('/changePassword', changePassword);
router.post('/joinCampaign', joinCampaign);
router.post('/validatePhoneNumber', validatePhoneNumber);
router.post('/createClient', createClient);
router.post('/endCall', endCall);
router.post('/getProgress', getProgress);
router.post('/getPhoneNumber', getPhoneNumber);
router.post('/login', login);

router.get('/getArea', getArea);

export default router;
