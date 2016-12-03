const twilio = require('twilio');
const moment = require('moment');
const momentTz = require('moment-timezone');

const resourceRequire = require('../lib/resourceRequire');

const SentimentAnalysis = require('../models/sentiment');

const CommConns = resourceRequire('models', 'CommConns');
const Communications = resourceRequire('models', 'Communications');
const Conversations = resourceRequire('models', 'Conversations');
const Messages = resourceRequire('models', 'Messages');
const Notifications = resourceRequire('models', 'Notifications');
const Organizations = resourceRequire('models', 'Organizations');
const OutboundVoiceMessages = resourceRequire('models', 'OutboundVoiceMessages');
const Recordings = resourceRequire('models', 'Recordings');

const sms = require('../lib/sms');
const s3 = require('../lib/s3');
const voice = require('../lib/voice');

module.exports = {
  
  webhook(req, res) {
    let fromNumber = req.body.From.replace(/\D+/g, '');
    let toNumber = req.body.To.replace(/\D+/g, '');
    if (fromNumber.length == 10) { 
      fromNumber = '1' + fromNumber; 
    }
    const twilioResponse = new twilio.TwimlResponse();
    let communication, organizationNumber;

    Organizations.findOneByPhone(toNumber)
    .then((resp) => {
      organizationNumber = resp && resp.phone ? resp.phone : '';
      console.log('\n\n');console.log('\n\n');
      console.log('got call');console.log('got call');
      console.log('got call', resp);
      console.log('got call - organizationNumber', organizationNumber);

      return Communications.findByValue(fromNumber);
    }).then((resp) => {
      communication = resp;

      if (communication) {
        twilioResponse.say(
          {voice: 'woman',},
          'Hello. We\'ve found your number in our system. ' +
          'Please leave a message for your case manager after '+
          'the beep.');
        const params = `?type=message&commId=${communication.commid}`;
        const url = `/webhook/voice/save-recording/${params}`;
        twilioResponse.record({
          action: url, 
          transcribe: true, 
          transcribeCallback: '/webhook/voice/transcribe',
        });
        res.send(twilioResponse.toString());
      } else {
        if (organizationNumber) {
          twilioResponse.dial({callerId: organizationNumber, });
        }

        try {
          organizationNumber = organizationNumber.replace(/\D+/g, '');
          organizationNumber = organizationNumber.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, '$1 ($2) $3-$4');
        } catch (e) {};

        // TODO: Make this component modular by organization(s)
        twilioResponse.say({ voice: 'woman', }, 
          `Sorry, we were unable to connect you with Criminal Justice Services. Please call the front or support desk ${organizationNumber}.`);
        res.send(twilioResponse.toString());
      }
    });
  },

  transcribe(req, res) {
    const RecordingSid = req.body.RecordingSid;
    Recordings.findOneByAttribute('RecordingSid', RecordingSid)
    .then((recording) => {
      if (recording) {
        return recording.update({transcription: req.body.TranscriptionText,})
        .then((recording) => {
          return Messages.where({recording_id: recording.id,});
        }).map((message) => {
          return message.update({content: req.body.TranscriptionText,});
        });
      }
    }).then(() => res.send('ok'))
    .catch(res.error500);
  },

  status(req, res) {
    if (req.body.CallStatus === 'completed') {
      const sid = req.body.CallSid;
      OutboundVoiceMessages.findOneByAttribute('call_sid', sid)
      .then((ovm) => {
        if (ovm) {
          return ovm.update({delivered: true,})
          .then((ovm) => {
            return Notifications.findOneByAttribute('ovm_id', ovm.id);
          }).then((notification) => {
            if (notification) {
              return notification.update({sent: true,});  
            } else {
              return null;
            }
          });
        } else {
          return null;
        }
      }).then((notification) => {
        res.send('ok');
      }).catch(res.error500);
    }
  },

  playMessage(req, res) {
    const ovmId = req.query.ovmId;
    const resp = new twilio.TwimlResponse();

    OutboundVoiceMessages.findById(ovmId)
    .then((ovm) => {
      if (ovm) {
        const url = ovm.getTemporaryRecordingUrl();  
        resp.say(
          {voice: 'woman',}, 
          'Hello. You have a new message from your case manager.');
        resp.play(url);
        resp.say(
          {voice: 'woman',},
          'Thank you.');
      } else {
        resp.say(
          {voice: 'woman',}, 
          'Sorry, we can\'t find a recording with that Id'
        );
      }
      res.send(resp.toString());              
    });
  },

  record(req, res) {
    const userId = req.query.userId;
    const commId = req.query.commId;
    const clientId = req.query.clientId;
    const deliveryDateEpoch = req.query.deliveryDate;

    const params = `?type=ovm&userId=${userId}&commId=${commId}`+
      `&deliveryDate=${deliveryDateEpoch}`+
      `&clientId=${clientId}`;

    const url = `/webhook/voice/save-recording/${params}`;

    const resp = twilio.TwimlResponse();
    resp.say({voice: 'woman',}, 'Hello! Please leave your message after the beep.');
    resp.record({action: url,});
    res.send(resp.toString());
  },

  save(req, res) {
    console.log('Recording save req body from Twilio\n', req.body);
    const type = req.query.type;
    if (!type) {
      return res.error500(new Error('save-recording needs a recording type'));
    }
    s3.uploadFromUrl(
      req.body.RecordingUrl,
      req.body.RecordingSid
    ).then((key) => {
      if (type === 'ovm') {

        const userId = req.query.userId;
        const commId = req.query.commId;
        const clientId = req.query.clientId;
        const deliveryDateEpoch = Number(req.query.deliveryDate);
        const deliveryDate = new Date(deliveryDateEpoch);

        return OutboundVoiceMessages.create({
          commid: commId,
          delivery_date: deliveryDate,
          RecordingSid: req.body.RecordingSid,
          recording_key: key,
        }).then((ovm) => {
          return Notifications.create(
            userId, clientId, 
            commId, 'Outbound Voice Message', '', 
            deliveryDate, ovm.id
          );
        });

      } else if (type === 'message') {
        
        const commId = req.query.commId;
        let toNumber = req.body.To.replace(/\D+/g, '');
        if (toNumber.length == 10) { 
          toNumber = '1' + toNumber; 
        }

        return Communications.findById(commId)
        .then((communication) => {
          if (!communication) {
            throw new Error(
              'No communication found for this recording' +
              'S3 key is ' + key
            );
          } else {
            let recording, conversations, clients;
            return Recordings.create({
              comm_id: communication.commid,
              recording_key: key,
              RecordingSid: req.body.RecordingSid,
              call_to: toNumber,
            }).then((resp) => {
              recording = resp;
              return sms.retrieveClients(recording.call_to, communication);
            }).then((resp) =>{
              clients = resp;
              return Conversations.retrieveByClientsAndCommunication(
                clients, communication
              );
            }).then((resp) => {
              conversations = resp;
              const conversationIds = conversations.map((conversation) => {
                return conversation.convid;
              });

              return Messages.insertIntoManyConversations(
                conversationIds,
                communication.commid,
                'Untranscribed voice message',
                req.body.RecordingSid,
                'recieved',
                toNumber, {
                  recordingId: recording.id,
                }
              );
            });
          }
        });
      }
    }).then(() => res.send('ok'))
    .catch(res.error500);
  },

  new(req, res) {
    const clientId = req.params.client;
    CommConns.findByClientIdWithCommMetaData(clientId)
    .then((communications) => {

      // filter out communications that are not type cell or landli
      communications = communications.filter((communication) => {
        let ok = false;
        if (communication.type == 'landline') ok = true;
        if (communication.type == 'cell') ok = true;
        return ok;
      });

      if (communications.length) {
        res.render('voice/create', {
          communications: communications,
        });
      } else {
        res.render('voice/noGoodNumbers');
      }
    }).catch(res.error500);
  },

  create(req, res) {
    const commId = req.body.commId;

    const deliveryDate = moment(req.body.sendDate)
                    .tz(res.locals.organization.tz)
                    .startOf('day')
                    .add(Number(req.body.sendHour), 'hours');

    let phoneNumber = req.body.phonenumber || '';
    phoneNumber = phoneNumber.replace(/[^0-9.]/g, '');
    if (phoneNumber.length == 10) { 
      phoneNumber = '1' + phoneNumber; 
    }

    if (phoneNumber.length == 11) {
      res.render('voice/callComing', {
        userProvidedNumber: phoneNumber,
      });
      
      voice.recordVoiceMessage(
        req.user,
        commId,
        res.locals.client.clid,
        deliveryDate.toDate(),
        phoneNumber
      );

    } else {
      req.flash('warning', 'Phone number is not long enough.');
      let redirectAddress = '/clients/';
      if (res.locals.level == 'org') {
        redirectAddress = '/org' + redirectAddress;
      }
      redirectAddress = redirectAddress + res.locals.client.clid + '/voicemessage';
      res.redirect(redirectAddress);
    }
  },

};