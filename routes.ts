import { Router } from 'express';

import addCallerCampaign from './router/admin/campaign/addCallerCampaign';
import addClientCampaign from './router/admin/campaign/addClientCampaign';
import changeCallerPassword from './router/caller/changeCallerPassword';
import changePasswordAdmin from './router/admin/management/changePassword';
import createCallerByAdmin from './router/caller/createCallerByAdmin';
import createCampaign from './router/admin/campaign/createCampaign';
import createClient from './router/admin/client/createClient';
import createClients from './router/admin/client/createClients';
import exportCallerCsv from './router/admin/client/exportCallerCsv';
import exportClientCsv from './router/admin/client/exportClientCsv';
import listCaller from './router/caller/listCaller';
import listCallerCampaign from './router/caller/listCallerCampaign';
import listCampaign from './router/admin/campaign/listCampaign';
import listClientCampaign from './router/admin/campaign/listClientCampaign';
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
import SearchByName from './router/admin/client/searchByName';
import changeCampaingPassword from './router/admin/campaign/changeCampaignPassword';
import clientInfo from './router/admin/client/clientInfo';
import SearchByPhone from './router/admin/client/searchByPhone';
import changeCallHoursStart from './router/admin/campaign/changeCallHoursStart';
import changeCallHoursEnd from './router/admin/campaign/changeCallHoursEnd';

const router = Router();

//stats
router.post('/stats/numberOfCallers', numberOfCallers);
router.post('/stats/call', call);
router.post('/stats/response', response);

//admin/campaign
router.post('/admin/campaign/changeCampaignPassword', changeCampaingPassword);
router.post('/admin/campaign/changeCallHoursStart', changeCallHoursStart);
router.post('/admin/campaign/changeCallHoursEnd', changeCallHoursEnd);
//admin/client
router.post('/admin/client/removeClient', removeClient);
router.post('/admin/client/searchByPhone', SearchByPhone);
router.post('/admin/client/searchByName', SearchByName);
router.post('/admin/client/removeClients', removeAllClients);
router.post('/admin/client/createClient', createClient);
router.post('/admin/client/createClients', createClients);
router.post('/admin/client/clientInfo', clientInfo);

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
