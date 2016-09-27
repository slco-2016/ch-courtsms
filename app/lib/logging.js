const modelsImport   = require("../models/models");
const Client = modelsImport.Client;
const Conversations = modelsImport.Conversations;

module.exports = {

  logClientActivity: function (clientID) {
    Clients.logActivity(clientID).then(() => { }).catch(() => { });
  },

  logConversationActivity: function (conversationID) {
    Conversations.logActivity(conversationID).then(() => { }).catch(() => { });
  }

}

