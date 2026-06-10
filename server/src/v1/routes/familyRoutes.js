const express = require('express');
const router = express.Router();
const {
  getSupportNetwork, inviteSupportPerson, revokeSupportPerson,
  getSupportedClientData, acceptSupportInvite
} = require('../controllers/familyController');

// Client: manage their support network
router.get('/network', getSupportNetwork);
router.post('/invite', inviteSupportPerson);
router.delete('/network/:id/revoke', revokeSupportPerson);

// SupportPerson: read-only view of the client they support
router.get('/my-client', getSupportedClientData);

// Public: accept invite (sets password, activates account)
router.post('/accept-invite', acceptSupportInvite);

module.exports = router;
