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

const router = Router();
//stats
router.post('/stats/callPerClient', callePerClient);
router.post('/stats/numberOfClients', numberOfClients);
router.post('/stats/numberOfCallers', numberOfCallers);
router.post('/stats/numberOfCalls', numberOfCalls);
//admin

router.post('/exportCallerCsv', exportCallerCsv);
router.post('/exportClientCsv', exportClientCsv);
router.post('/createCaller', createCaller);
router.post('/listCallerCampaign', listCallerCampaign);
router.post('/listCaller', listCaller);
router.post('/listClientCampaign', listClientCampaign);
router.post('/createCallerByAdmin', createCallerByAdmin);
router.post('/createCampaign', createCampaign);
router.post('/addClientCampaign', addClientCampaign);
router.post('/addCallerCampaign', addCallerCampaign);
router.post('/changeCallerPassword', chnageCallerPassword);
//caller
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
