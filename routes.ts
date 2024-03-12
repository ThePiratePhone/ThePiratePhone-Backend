import { Router } from 'express';

import addCallerCampaign from './router/admin/addCallerCampaign';
import addClientCampaign from './router/admin/addClientCampaign';
import changeCallerPassword from './router/admin/changeCallerPassword';
import changePasswordAdmin from './router/admin/management/changePassword';
import createCallerByAdmin from './router/admin/createCallerByAdmin';
import createCampaign from './router/admin/createCampaign';
import createClient from './router/admin/client/createClient';
import createClients from './router/admin/client/createClients';
import exportCallerCsv from './router/admin/exportCallerCsv';
import exportClientCsv from './router/admin/exportClientCsv';
import listCaller from './router/admin/listCaller';
import listCallerCampaign from './router/admin/listCallerCampaign';
import listCampaign from './router/admin/listCampaign';
import listClientCampaign from './router/admin/listClientCampaign';
import loginAdmin from './router/admin/login';
import changePassword from './router/caller/changePassword';
import createCaller from './router/caller/createCaller';
import endCall from './router/caller/endCall';
import getPhoneNumber from './router/caller/getPhoneNumber';
import getProgress from './router/caller/getProgress';
import giveUp from './router/caller/giveUp';
import joinCampaign from './router/caller/joinCampaign';
import login from './router/caller/login';
import validatePhoneNumber from './router/caller/validatePhoneNumber';
import getArea from './router/getArea';
import numberOfCallers from './router/stats/numberOfCallers';
import response from './router/stats/response';
import call from './router/stats/call';
import changeNumberMaxCall from './router/admin/management/changeNumberMaxCall';
import changeTimeBetwenCall from './router/admin/management/changeTimeBetwenCall';
import removeClient from './router/admin/client/removeClient';
import removeAllClients from './router/admin/client/removeAllClients';
import SearchByPhone from './router/admin/client/searchByPhone';
import SearchByName from './router/admin/client/searchByName';

const router = Router();

//stats
router.post('/stats/numberOfCallers', numberOfCallers);
router.post('/stats/call', call);
router.post('/stats/response', response);

//admin/client
router.post('/admin/client/removeClient', removeClient);
router.post('/admin/client/searchByPhone', SearchByPhone);
router.post('/admin/client/searchByName', SearchByName);
router.post('/admin/client/removeClients', removeAllClients);
router.post('/admin/client/createClient', createClient);
router.post('/admin/client/createClients', createClients);
//admin/
router.post('/admin/changeNumberMaxCall', changeNumberMaxCall);
router.post('/admin/changeTimeBetwenCall', changeTimeBetwenCall);
router.post('/admin/addCallerCampaign', addCallerCampaign);
router.post('/admin/addClientCampaign', addClientCampaign);
router.post('/admin/campaign', listCampaign);
router.post('/admin/changePassword', changePasswordAdmin);
router.post('/admin/createCaller', createCallerByAdmin);
router.post('/admin/changeCallerPassword', changeCallerPassword);
router.post('/admin/createCampaign', createCampaign);
router.post('/admin/exportCallerCsv', exportCallerCsv);
router.post('/admin/exportClientCsv', exportClientCsv);
router.post('/admin/listCaller', listCaller);
router.post('/admin/listCallerCampaign', listCallerCampaign);
router.post('/admin/listClientCampaign', listClientCampaign);
router.post('/admin/login', loginAdmin);

//caller
router.post('/changePassword', changePassword);
router.post('/createCaller', createCaller);
router.post('/endCall', endCall);
router.post('/getPhoneNumber', getPhoneNumber);
router.post('/getProgress', getProgress);
router.post('/giveUp', giveUp);
router.post('/joinCampaign', joinCampaign);
router.post('/login', login);
router.post('/validatePhoneNumber', validatePhoneNumber);

router.get('/getArea', getArea);

export default router;
