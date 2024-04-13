import { Router } from 'express';

import ChangePassword from './router/admin/area/changeAdminPassword';
import ChangeName from './router/admin/area/changeName';
import ChangePin from './router/admin/area/changePin';
import callerInfo from './router/admin/caller/callerInfo';
import changeCallerPassword from './router/admin/caller/changeCallerPassword';
import changeNameCallerByAdmin from './router/admin/caller/changeName';
import cleanAspiration from './router/admin/caller/cleanAspiration';
import exportCallerCsv from './router/admin/caller/exportCallerCsv';
import newCaller from './router/admin/caller/newCaller';
import removeCaller from './router/admin/caller/removeCaller';
import SearchCallerByName from './router/admin/caller/searchByName';
import SearchCallerByPhone from './router/admin/caller/searchByPhone';
import addCallerCampaign from './router/admin/campaign/addCallerCampaign';
import addClientCampaign from './router/admin/campaign/addClientCampaign';
import changeCallHours from './router/admin/campaign/changeCallHours';
import changeCampaingPassword from './router/admin/campaign/changeCampaignPassword';
import changeName from './router/admin/campaign/changeName';
import changeScript from './router/admin/campaign/changeScript';
import createCampaign from './router/admin/campaign/createCampaign';
import listCampaign from './router/admin/campaign/listCampaign';
import listClientCampaign from './router/admin/campaign/listClientCampaign';
import setActive from './router/admin/campaign/setActive';
import clientInfo from './router/admin/client/clientInfo';
import createClient from './router/admin/client/createClient';
import createClients from './router/admin/client/createClients';
import exportClientCsv from './router/admin/client/exportClientCsv';
import removeAllClients from './router/admin/client/removeAllClients';
import removeClient from './router/admin/client/removeClient';
import SearchByName from './router/admin/client/searchByName';
import SearchByPhone from './router/admin/client/searchByPhone';
import loginAdmin from './router/admin/login';
import changeNumberMaxCall from './router/admin/management/changeNumberMaxCall';
import changePasswordAdmin from './router/admin/management/changePassword';
import changeTimeBetwenCall from './router/admin/management/changeTimeBetwenCall';
import changeNameCallerByCaller from './router/caller/changeName';
import changePassword from './router/caller/changePassword';
import createCaller from './router/caller/createCaller';
import endCall from './router/caller/endCall';
import getPhoneNumber from './router/caller/getPhoneNumber';
import getProgress from './router/caller/getProgress';
import giveUp from './router/caller/giveUp';
import joinCampaign from './router/caller/joinCampaign';
import listCaller from './router/caller/listCaller';
import listCallerCampaign from './router/caller/listCallerCampaign';
import login from './router/caller/login';
import resetCallerPassword from './router/caller/resetPassword/resetPassword';
import sendReset from './router/caller/resetPassword/sendReset';
import validatePhoneNumber from './router/caller/validatePhoneNumber';
import getArea from './router/getArea';
import OtherCallerInfo from './router/otherCaller/OtherCallerInfo';
import scoreBoard from './router/otherCaller/scoreBoard';
import call from './router/stats/call';
import numberOfCallers from './router/stats/numberOfCallers';
import response from './router/stats/response';
import getCampaign from './router/admin/campaign/GetCampaign';
import callByDate from './router/stats/callByDate';

const router = Router();
const aspirationDetector = new Map<String, number>();
const resetPassword = new Map<String, { date: Date; password: String; try: number }>();
//stats
router.post('/stats/numberOfCallers', numberOfCallers);
router.post('/stats/call', call);
router.post('/stats/response', response);
router.post('/stats/callByDate', callByDate);

//admin/area
router.post('/admin/area/changeName', ChangeName);
router.post('/admin/area/changePin', ChangePin);
router.post('/admin/area/changePasword', ChangePassword);
//admin/campaign
router.post('/admin/campaign/changeCampaignPassword', changeCampaingPassword);
router.post('/admin/campaign/setActive', setActive);
router.post('/admin/campaign/changeName', changeName);
router.post('/admin/campaign/changeCallHours', changeCallHours);
router.post('/admin/campaign/changeTimeBetwenCall', changeTimeBetwenCall);
router.post('/admin/campaign/changeNumberMaxCall', changeNumberMaxCall);
router.post('/admin/campaign/addClientCampaign', addClientCampaign);
router.post('/admin/campaign/listCallerCampaign', listCallerCampaign);
router.post('/admin/campaign/listClientCampaign', listClientCampaign);
router.post('/admin/campaign/campaign', listCampaign);
router.post('/admin/campaign/getCampaign', getCampaign);
router.post('/admin/campaign/changeScript', changeScript);
//admin/client
router.post('/admin/client/searchByName', SearchByName);
router.post('/admin/client/removeClient', removeClient);
router.post('/admin/client/searchByPhone', SearchByPhone);
router.post('/admin/addCallerCampaign', addCallerCampaign);
router.post('/admin/client/removeClients', removeAllClients);
router.post('/admin/client/createClient', createClient);
router.post('/admin/client/createClients', createClients);
router.post('/admin/client/clientInfo', clientInfo);
router.post('/admin/client/exportClientsCsv', exportClientCsv);
//admin/caller
router.post('/admin/caller/cleanAspiration', (req, res) => cleanAspiration(req, res, aspirationDetector));
router.post('/admin/caller/changeCallerPassword', changeCallerPassword);
router.post('/admin/caller/callerInfo', callerInfo);
router.post('/admin/caller/createCaller', newCaller);
router.post('/admin/caller/removeCaller', removeCaller);
router.post('/admin/caller/searchByName', SearchCallerByName);
router.post('/admin/caller/searchByPhone', SearchCallerByPhone);
router.post('/admin/caller/changeName', changeNameCallerByAdmin);
router.post('/admin/caller/exportCallersCsv', exportCallerCsv);
router.post('/admin/caller/listCaller', listCaller);
//admin/
router.post('/admin/changePassword', changePasswordAdmin);
router.post('/admin/createCampaign', createCampaign);
router.post('/admin/login', loginAdmin);

//otherCaller
router.post('/otherCaller/scoreBoard', scoreBoard);
router.post('/otherCaller/info', OtherCallerInfo);

//caller
router.post('/changePassword', changePassword);
router.post('/createCaller', createCaller);
router.post('/endCall', endCall);
router.post('/getPhoneNumber', (req, res) => getPhoneNumber(req, res, aspirationDetector));
router.post('/getProgress', getProgress);
router.post('/giveUp', giveUp);
router.post('/joinCampaign', joinCampaign);
router.post('/login', login);
router.post('/validatePhoneNumber', validatePhoneNumber);
router.post('/changeName', changeNameCallerByCaller);
router.post('/resetPassword/sendReset', (req, res) => sendReset(req, res, resetPassword));
router.post('/resetPassword/resetPassword', (req, res) => resetCallerPassword(req, res, resetPassword));

router.get('/getArea', getArea);

export default router;
