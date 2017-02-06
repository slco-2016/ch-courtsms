const modelsImport = require('../models/models');
const Client = modelsImport.Client;
const Conversations = modelsImport.Conversations;

module.exports = {

  logClientActivity(clientID) {
    Clients.logActivity(clientID).then(() => { }).catch(() => { });
  },

  logConversationActivity(conversationID) {
    Conversations.logActivity(conversationID).then(() => { }).catch(() => { });
  },

};

