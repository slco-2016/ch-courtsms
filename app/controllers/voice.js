const twilio = require('twilio');
const moment = require('moment');
let moment_tz = require("moment-timezone");

const resourceRequire = require('../lib/resourceRequire')

const SentimentAnalysis = require('../models/sentiment');

const CommConns = resourceRequire('models', 'CommConns')
const Communications = resourceRequire('models', 'Communications')
const Conversations = resourceRequire('models', 'Conversations')
const Messages = resourceRequire('models', 'Messages')
const Notifications = resourceRequire('models', 'Notifications')
const OutboundVoiceMessages = resourceRequire('models', 'OutboundVoiceMessages');
const Recordings = resourceRequire('models', 'Recordings')

const sms = require('../lib/sms');
const s3 = require('../lib/s3');
const voice = require('../lib/voice');

module.exports = {
  
  webhook(req, res) {
    let fromNumber = req.body.From.replace(/\D+/g, "");
    if (fromNumber.length == 10) { 
      fromNumber = "1" + fromNumber; 
    }
    let resp = new twilio.TwimlResponse();
    Communications.findByValue(fromNumber)
    .then((communication) => {
      if (communication) {
        resp.say(
          {voice: 'woman'},
          "Hello. We've found your number in our system. " +
          "Please leave a message for your case manager after "+
          "the beep.")
        let params = `?type=message&commId=${communication.commid}`
        let url = `/webhook/voice/save-recording/${params}`
        resp.record({
          action: url, 
          transcribe: true, 
          transcribeCallback: "/webhook/voice/transcribe",
        })
        res.send(resp.toString())
      } else {        
        resp.say(
          {voice: 'woman'}, 
          "Welcome to Client Comm. We were unable to find "+
          "your number in our system. Please hold while we "+
          "forward you to the front desk")
        // resp.dial({callerId: "13854683500"})
        resp.dial({callerId: "12033133609"})
        res.send(resp.toString())
      }
    })
  },

  transcribe(req, res) {
    let RecordingSid = req.body.RecordingSid
    Recordings.findOneByAttribute('RecordingSid', RecordingSid)
    .then((recording) => {
      if (recording) {
        return recording.update({transcription: req.body.TranscriptionText})
        .then((recording) => {
          return Messages.where({recording_id: recording.id})
        }).map((message) => {
          return message.update({content: req.body.TranscriptionText})
        })
      }
    }).then(() => res.send('ok'))
    .catch(res.error500)
  },

  status(req, res) {
    if (req.body.CallStatus === "completed") {
      let sid = req.body.CallSid;
      OutboundVoiceMessages.findOneByAttribute('call_sid', sid)
      .then((ovm) => {
        if (ovm) {
          return ovm.update({delivered: true})
          .then((ovm) => {
            return Notifications.findOneByAttribute('ovm_id', ovm.id)
          }).then((notification) => {
            if (notification) {
              return notification.update({sent: true})  
            } else {
              return null
            }
          })
        } else {
          return null
        }
      }).then((notification) => {
        res.send("ok")
      }).catch(res.error500)
    }
  },

  playMessage(req, res) {
    let ovmId = req.query.ovmId
    let resp = new twilio.TwimlResponse();

    OutboundVoiceMessages.findById(ovmId)
    .then((ovm) => {
      if (ovm) {
        let url = ovm.getTemporaryRecordingUrl()  
        resp.say(
          {voice: 'woman'}, 
          "Hello. You have a new message from your case manager.")
        resp.play(url)
        resp.say(
          {voice: 'woman'},
          "Thank you.")
      } else {
        resp.say(
          {voice: 'woman'}, 
          "Sorry, we can't find a recording with that Id"
        )
      }
      res.send(resp.toString())              
    })
  },

  record(req, res) {
    let userId = req.query.userId
    let commId = req.query.commId
    let clientId = req.query.clientId
    let deliveryDateEpoch = req.query.deliveryDate

    let params = `?type=ovm&userId=${userId}&commId=${commId}`+
      `&deliveryDate=${deliveryDateEpoch}`+
      `&clientId=${clientId}`

    let url = `/webhook/voice/save-recording/${params}`

    let resp = twilio.TwimlResponse();
    resp.say({voice: 'woman'}, "Hello! Please leave your message after the beep.")
    resp.record({action: url})
    res.send(resp.toString())
  },

  save(req, res) {
    let type = req.query.type
    if (!type) {
      return res.error500(new Error("save-recording needs a recording type"))
    }
    s3.uploadFromUrl(
      req.body.RecordingUrl,
      req.body.RecordingSid
    ).then((key) => {
      if (type === "ovm") {

        let userId = req.query.userId
        let commId = req.query.commId
        let clientId = req.query.clientId
        let deliveryDateEpoch = Number(req.query.deliveryDate)
        let deliveryDate = new Date(deliveryDateEpoch)

        return OutboundVoiceMessages.create({
          commid: commId,
          delivery_date: deliveryDate,
          RecordingSid: req.body.RecordingSid,
          recording_key: key,
        }).then((ovm) => {
          return Notifications.create(
            userId, clientId, 
            commId, "Outbound Voice Message", "", 
            deliveryDate, ovm.id
          )
        })

      } else if (type === "message") {
        
        let commId = req.query.commId
        let toNumber = req.body.To.replace(/\D+/g, "");
        if (toNumber.length == 10) { 
          toNumber = "1" + toNumber; 
        }

        return Communications.findById(commId)
        .then((communication) => {
          if (!communication) {
            throw new Error(
              "No communication found for this recording" +
              "S3 key is " + key
            )
          } else {
            let recording, conversations, clients;
            return Recordings.create({
              comm_id: communication.commid,
              recording_key: key,
              RecordingSid: req.body.RecordingSid,
              call_to: toNumber,
            }).then((resp) => {
              recording = resp
              return sms.retrieveClients(recording.call_to, communication);
            }).then((resp) =>{
              clients = resp
              return Conversations.retrieveByClientsAndCommunication(
                clients, communication
              )
            }).then((resp) => {
              conversations = resp;
              let conversationIds = conversations.map((conversation) => {
                return conversation.convid;
              });

              return Messages.insertIntoManyConversations(
                conversationIds,
                communication.commid,
                "Untranscribed voice message",
                req.body.RecordingSid,
                'recieved',
                toNumber, {
                  recordingId: recording.id
                }
              );
            })
          }
        })
      }
    }).then(() => res.send('ok'))
    .catch(res.error500)
  },

  new(req, res) {
    let clientId = req.params.client;
    CommConns.findByClientIdWithCommMetaData(clientId)
    .then((communications) => {

      // filter out communications that are not type cell or landli
      communications = communications.filter((communication) => {
        let ok = false;
        if (communication.type == "landline") ok = true;
        if (communication.type == "cell") ok = true;
        return ok;
      });

      if (communications.length) {
        res.render('voice/create', {
          communications: communications
        });
      } else {
        res.render('voice/noGoodNumbers');
      }
    }).catch(res.error500);
  },

  create(req, res) {
    let commId = req.body.commId;

    let deliveryDate = moment(req.body.sendDate)
                    .tz(res.locals.organization.tz)
                    .startOf("day")
                    .add(Number(req.body.sendHour), "hours");

    let phoneNumber = req.body.phonenumber || "";
    phoneNumber = phoneNumber.replace(/[^0-9.]/g, "");
    if (phoneNumber.length == 10) { 
      phoneNumber = "1" + phoneNumber; 
    }

    if (phoneNumber.length == 11) {
      res.render('voice/callComing', {
        userProvidedNumber: phoneNumber
      });
      
      voice.recordVoiceMessage(
        req.user,
        commId,
        res.locals.client.clid,
        deliveryDate.toDate(),
        phoneNumber
      )

    } else {
      req.flash("warning", "Phone number is not long enough.");
      let redirectAddress = "/clients/";
      if (res.locals.level == "org") {
        redirectAddress = "/org" + redirectAddress;
      }
      redirectAddress = redirectAddress + res.locals.client.clid + "/voicemessage";
      res.redirect(redirectAddress);
    }
  }

};