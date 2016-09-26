const mimelib = require('mimelib');
const credentials = require('../../credentials')
const request = require('request');

const Messages = require('../models/messages')
const Emails = require('../models/emails')
const Twilio = require('../models/twilio')
const Attachments = require('../models/attachments')

const Promise = require("bluebird");

module.exports = {
  webhook(req, res) {
    let event = req.body.event
    console.log(req.body)
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

      Messages.findByPlatformId(messageId)
      .then((message) => {
        if (message) {
          return message.update({tw_status: "Opened"})
        } else {
          throw `No message found with message id ${messageId}`
        }
      }).catch((err) => {
        console.log(err)
      })
    }

    // TODO "open" event

    res.send('ok, thanks');
  },
  receive(req, res) {
        // mailgun's philosophy here seems to be that if they can populate a section they
    // will, or they will omit it. This can be very confusing.
    // eg: if there is one recipient they will populate "recipient", but they
    // will populate "reciepients" if there are multiple.
    // would keep this in mind when trusing these values.

    console.log(req.body)

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

    var fromAddress = mimelib.parseAddresses(req.body.From)[0]
    var toAddresses = mimelib.parseAddresses(req.body.To)

    console.log(fromAddress)
    console.log(toAddresses)
    console.log(`Email arrived for ${recipient}`)
    console.log(`Content is \n${cleanBody}`)
    
    let attachments = []
    if (req.body.attachments) {
      attachments = JSON.parse(req.body.attachments)
    }

    // this is to avoid timeouts. maybe we want timeouts?
    // attachment uploading takes too long?
    res.send('ok, thanks');

    let msgid

    Twilio.process_incoming_msg(
        fromAddress.address,
        toAddresses, 
        [cleanBody], 
        "email",
        "delivered",
        messageId
    ).then((msgs) =>{
        // we're passing an array of 1 item to process_incoming_msg
        // so should be guaranteed a single returned id
        msgid = msgs[0]

        return Emails.create({
          raw: JSON.stringify(req.body),
          from: fromAddress,
          to: JSON.stringify(toAddresses),
          cleanBody: cleanBody,
          msg_id: msgid,
        })

    }).then((email) => {
      return new Promise((fulfill, reject) => {
        fulfill(attachments)
      })
    }).map((attachment) => {
      console.log(attachment)
      return Attachments.createFromMailgunObject(attachment, msgid)
    }).then((attachments) => {
      console.log(attachments)
    }).catch((err) => {
      console.log(err)
    })
  }
};