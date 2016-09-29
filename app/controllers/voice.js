const Conversations = require('../models/conversations');
const OutboundVoiceMessages = require('../models/outboundVoiceMessages');
const Messages = require('../models/messages');
const SentimentAnalysis = require('../models/sentiment');
const sms = require('../lib/sms');
const s3 = require('../lib/s3')

module.exports = {

  webhook(req, res) {
    res.send(`<?xml version='1.0' encoding='UTF-8'?>
              <Response>
                <Say voice='woman'>
                  Client Comm is a text only number currently. 
                  Please dial 385-468-3500 for the front desk and ask for your case manager.
                </Say>
              </Response>`);
  },
  record(req, res) {
    let userId = req.query.userId
    let clientId = req.query.clientId
    let deliveryDateEpoch = req.query.deliveryDate
    let params = `?userId=${userId}&amp;clientId=${clientId}`
    params += `&amp;deliveryDate=${deliveryDateEpoch}`
    let url = `/webhook/voice/save-recording/${params}`
    res.send(`<?xml version='1.0' encoding='UTF-8'?>
              <Response>
                <Say voice='woman'>
                  Hello! Please leave your message after the beep.
                </Say>
                <Record action="${url}" />
              </Response>`);
  },
  save(req, res) {
    let userId = req.query.userId
    let clientId = req.query.clientId
    let deliveryDateEpoch = Number(req.query.deliveryDate)
    let deliveryDate = new Date(deliveryDateEpoch)
    let recordingUrl = req.body.RecordingUrl

    s3.uploadFromUrl(
      req.body.RecordingUrl, 
      req.body.RecordingSid
    ).then((key) => {
      return OutboundVoiceMessages.create({
        client_id: clientId,
        delivery_date: deliveryDate,
        RecordingSid: req.body.RecordingSid,
        recording_key: key,
      })
    }).then((outboundVoiceMessage) => {
      res.send('ok')
    }).catch(res.error500)
  },

};