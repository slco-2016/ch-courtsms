const mimelib = require('mimelib');
const credentials = require('../../credentials')
const request = require('request');

const Attachments = require('../models/attachments')
const Communications = require('../models/communications')
const Conversations = require('../models/conversations')
const Clients = require('../models/clients')
const Emails = require('../models/emails')
const Messages = require('../models/messages')
const Users = require('../models/users')

const sms = require('../lib/sms')

const Promise = require("bluebird");

module.exports = {
  _updateMessages() {
    // TODO:
  },
  webhook(req, res) {
    let event = req.body.event
    if (event == "delivered") {
      let messageId = req.body['Message-Id']
      Messages.findByPlatformId(messageId)
      .then((message) => {
        if (message) {
          return message.update({tw_status: "Delivered"})          
        } else {
          throw `No message found with message id ${messageId}`
        }
      }).catch((err) => {
        console.log(err)
      })
    } else if (event == "opened") {
      let messageId = `<${req.body['message-id']}>`
      // why, just why

      Messages.findAllByPlatformId(messageId)
      .then((messages) => {
        if (messages) {
          messages.forEach((message) => {
            message.update({tw_status: "Opened"})
          })
        } else {
          throw `No message found with message id ${messageId}`
        }
      }).catch((err) => {
        console.log(err)
      })
    }
    
    res.send('ok, thanks');
  },
  receive(req, res) {
    // mailgun's philosophy here seems to be that if they can populate a section they
    // will, or they will omit it. This can be very confusing.
    // eg: if there is one recipient they will populate "recipient", but they
    // will populate "reciepients" if there are multiple.
    // would keep this in mind when trusing these values.

    // console.log(req.body)

    var domain = req.body.domain;
    var headers = req.body['message-headers'];
    var messageId = req.body['Message-Id'];
    var recipient = req.body.recipient;
    var event = req.body.event;
    var timestamp = req.body.timestamp;
    var token = req.body.token;
    var signature = req.body.signature;
    var recipient = req.body.recipient; 
    var bodyPlain = req.body['body-plain'];

    var cleanBody = req.body['stripped-text'] || req.body['body-plain']

    var fromAddresses = mimelib.parseAddresses(req.body.From)
    var fromAddress = fromAddresses[0]
    var toAddresses = mimelib.parseAddresses(req.body.To)

    let attachments = []
    if (req.body.attachments) {
      attachments = JSON.parse(req.body.attachments)
    }

    let clients, communication, users, email
    Emails.create({
      raw: JSON.stringify(req.body),
      from: fromAddress.address,
      to: JSON.stringify(toAddresses),
      cleanBody: cleanBody,
      messageId: messageId,
    }).then((resp) => {
      email = resp;
      return new Promise((fulfill, reject) => {
        fulfill(attachments)
      })
    }).map((attachment) => {
      return Attachments.createFromMailgunObject(attachment, email)
    }).then((attachments) => {
      return Communications.getOrCreateFromValue(
        fromAddress.address, 
        "email"
      )
    }).then((resp) => {
      communication = resp;
      return Clients.findByCommId(communication.commid);
    }).then((resp) => {
      clients = resp;
      return new Promise((fulfill, reject) => {
        fulfill(toAddresses)
      });
    }).map((address) => {
      return Users.findByClientCommEmail(address.address)
    }).then((resp) => {
      users = resp;
      return new Promise((fulfill, reject) => {
        fulfill(users);
      });
    }).map((user) => {
      let clientsForUser = clients.filter((client) => {
        return client.cm === user.cmid;
      });
      return Conversations.retrieveByClientsAndCommunication(
        clientsForUser, 
        communication
      )
      // TODO: I mean, like, maybe? 
      // ).then((conversations) => {
      //   return Conversations.closeAllWithClientExcept(client, conversationId);
      // })

    }).then((listOfListOfConversations) => {
      let conversations = [];
      listOfListOfConversations.forEach((conversationList) => {
        conversations = conversations.concat(conversationList)
      })
      let conversationIds = conversations.map((conversation) => {
        return conversation.convid;
      });

      sentTo = toAddresses.map( address => address.address ).join(", ")

      return Messages.insertIntoManyConversations(conversationIds,
                                                  communication.commid,
                                                  cleanBody,
                                                  messageId,
                                                  "received",
                                                  sentTo,
                                                  {emailId: email.id});
    }).then((messages) => {
      res.send('ok, thanks');
    }).catch(res.error500);
  }
};

