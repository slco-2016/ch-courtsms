const twilio = require('twilio');

const Conversations = require('../models/conversations');
const Communications = require('../models/communications');
const OutboundVoiceMessages = require('../models/outboundVoiceMessages');
const Messages = require('../models/messages');
const SentimentAnalysis = require('../models/sentiment');

const sms = require('../lib/sms');
const s3 = require('../lib/s3')


module.exports = {
  webhook(req, res) {
    let fromNumber = req.body.From.replace(/\D+/g, "");
    if (fromNumber.length == 10) { 
      from = "1" + from; 
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
        let params = `?type=ovm&commId=${communication.commid}`
        let url = `/webhook/voice/save-recording/${params}`
        resp.record({action: url})
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
  status(req, res) {
    if (req.body.CallStatus === "completed") {
      let sid = req.body.CallSid;
      OutboundVoiceMessages.findOneByAttribute('call_sid', sid)
      .then((ovm) => {
        if (ovm) {
          return ovm.update({delivered: true})  
        } else {
          res.send("ok")
          return null
        }
      }).then((ovm) => {
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
    let clientId = req.query.clientId
    let deliveryDateEpoch = req.query.deliveryDate

    let params = `?type=ovm&userId=${userId}&clientId=${clientId}`+
      `&deliveryDate=${deliveryDateEpoch}`

    let url = `/webhook/voice/save-recording/${params}`

    let resp = twilio.TwimlResponse();
    resp.say({voice: 'woman'}, "Hello! Please leave your message after the beep.")
    resp.record({action: url})
    resp.send(resp.toString())
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
        let clientId = req.query.clientId
        let deliveryDateEpoch = Number(req.query.deliveryDate)
        let deliveryDate = new Date(deliveryDateEpoch)
        return OutboundVoiceMessages.create({
          client_id: clientId,
          delivery_date: deliveryDate,
          RecordingSid: req.body.RecordingSid,
          recording_key: key,
        }).then((outboundVoiceMessage) => {
          res.send('ok')
        })
      } else if (type === "message") {
        
      }
    }).then(() => res.send('ok'))
    }).catch(res.error500)
  },

};