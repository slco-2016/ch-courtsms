const twilio = require('twilio');
const moment = require('moment');
const momentTz = require('moment-timezone');

const resourceRequire = require('../lib/resourceRequire');

const SentimentAnalysis = require('../models/sentiment');

const Clients = resourceRequire('models', 'Clients');
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
    const toNumber = req.body.To.replace(/\D+/g, '');
    if (fromNumber.length == 10) {
      fromNumber = `1${fromNumber}`;
    }
    const twilioResponse = new twilio.TwimlResponse();
    let communication,
      organizationNumber;

    Organizations.findOneByPhone(toNumber)
    .then((resp) => {
      organizationNumber = resp && resp.phone ? resp.phone : '';

      return Communications.findByValue(fromNumber);
    }).then((resp) => {
      communication = resp;

      if (communication) {
        twilioResponse.say(
          { voice: 'woman' }, 'Hello. Please leave a message for your case manager after the beep.');
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
          twilioResponse.dial({ callerId: organizationNumber });
        }

        // this will make the text-to-voice in twilio read the phone number more clearly
        try {
          organizationNumber = organizationNumber.replace(/\D+/g, '');
          organizationNumber = organizationNumber.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, '$1 ($2) $3-$4');
        } catch (e) {}

        // TODO: Make this component modular by organization(s)
        twilioResponse.say({ voice: 'woman' },
          `Sorry, we were unable to connect you with Criminal Justice Services. Please call the front or support desk ${organizationNumber}.`);
        res.send(twilioResponse.toString());
      }
    });
  },

  transcribe(req, res) {
    const RecordingSid = req.body.RecordingSid;
    Recordings.findManyByAttribute('RecordingSid', RecordingSid)
    .map((recording) => {
      if (recording) {
        return recording.update({ transcription: req.body.TranscriptionText })
        .then(recording => Messages.where({ recording_id: recording.id })).map(message => message.update({ content: req.body.TranscriptionText }));
      }
    }).then((messages) => {
      const emptyResponse = twilio.TwimlResponse().toString();
      res.send(emptyResponse);
    }).catch(res.error500);
  },

  status(req, res) {
    let client,
      communication,
      conversations,
      notification,
      ovm;
    const emptyResponse = twilio.TwimlResponse().toString();

    // we need to have an additional capture if callStatus 'failed'
    const callStatus = req.body.CallStatus;
    if (callStatus === 'completed' || callStatus == 'failed') {
      const sid = req.body.CallSid;

      // We are looking for the row with a OVM that has the call
      OutboundVoiceMessages.findOneByAttribute('call_sid', sid)
      .then((resp) => {
        ovm = resp;

        // If we have an OVM, then we should get its notification and
        // set it's status to sent as well as create a recording object
        // and new message + conversation for that client-user pairing.

        // if we do not have an ovm, then it does not exist in the database
        // TODO: Would this ever happen? Should we keep it?

        // We also need to make sure that 2 tries or 30 (1800000 milliseconds) minutes have passed
        const rightNow = new Date().getTime();
        const ovmDeliveryDate = new Date(ovm.delivery_date).getTime();
        const enoughTimeHasPassed = rightNow - 1800000 > ovmDeliveryDate;

        // make sure one of the two is ok in order to proceed
        const completedOK = (callStatus === 'completed' && ovm);
        const failedOK = (callStatus === 'failed' && ovm && enoughTimeHasPassed);

        if (completedOK || failedOK) {
          // this is what we are updating about the OVM row
          const updateObj = { delivered: true };

          // if the OVM failed to send, we will log a last delivery
          // timestamp attempted as well
          if (failedOK) {
            updateObj.last_delivery_attempt = moment().tz('Europe/Dublin').format();
          }

          // execute the udpate
          return ovm.update(updateObj)
          .then(ovm => Notifications.findOneByAttribute('ovm_id', ovm.id)).then(notification => notification.update({ sent: true })).then((notification) => {
            const commId = notification.comm;
            const recordingKey = ovm.recording_key;
            const recordingSid = ovm.RecordingSid;
            const clientId = notification.client;
            const userId = notification.cm;

            // determine what the status should be - whether it was successful or not
            // default will be 'received'
            let status = 'received';
            if (failedOK) {
              status = 'undelivered';
            }

            // now we add that just-sent outbound message to the message stream
            return voice.addOutboundRecordingAndMessage(commId, recordingKey, recordingSid, clientId, userId, status);
          });
        }
        return null;
      }).then(() => {
        res.send(emptyResponse);
      }).catch(res.error500);

    // otherwise, no matter what, we send an empty response
    } else {
      res.send(emptyResponse);
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
          { voice: 'woman' },
          'Hello. You have a new message from your case manager.');
        resp.play(url);
        resp.say(
          { voice: 'woman' },
          'Thank you.');
      } else {
        resp.say(
          { voice: 'woman' },
          'Sorry, we can\'t find a recording with that Id',
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

    const params = `?type=ovm&userId=${userId}&commId=${commId}` +
      `&deliveryDate=${deliveryDateEpoch}` +
      `&clientId=${clientId}`;

    const url = `/webhook/voice/save-recording/${params}`;

    const resp = twilio.TwimlResponse();
    resp.say({ voice: 'woman' }, 'Hello! Please leave your message after the beep.');
    resp.record({ action: url });
    res.send(resp.toString());
  },

  save(req, res) {
    // console.log('Recording save req.body from Twilio\n', req.body);

    const type = req.query.type;
    if (!type) {
      return res.error500(new Error('save-recording needs a recording type'));
    }

    s3.uploadFromUrl(
      req.body.RecordingUrl,
      req.body.RecordingSid,
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
          call_sid: req.body.CallSid,
        }).then(ovm => Notifications.create(
            userId, clientId,
            commId, 'Outbound Voice Message', '',
            deliveryDate, ovm.id,
          )).then(notification => notification);
      } else if (type === 'message') {
        const commId = req.query.commId;
        let toNumber = req.body.To.replace(/\D+/g, '');
        if (toNumber.length == 10) {
          toNumber = `1${toNumber}`;
        }

        return Communications.findById(commId)
        .then((communication) => {
          if (!communication) {
            throw new Error(
              `${'No communication found for this recording' +
              'S3 key is '}${key}`,
            );
          } else {
            const recordingSid = req.body.RecordingSid;
            const recordingKey = key;
            const communicationObj = communication;

            // Needed to proceed
            // communication obj
            // key (recording_key)
            // RecordingSid
            // toNumber (10 digit)
            return voice.addInboundRecordingAndMessage(communicationObj, recordingKey, recordingSid, toNumber);
          }
        });
      }
    }).then(() => {
      const emptyResponse = twilio.TwimlResponse().toString();
      res.send(emptyResponse);
    }).catch(res.error500);
  },

  new(req, res) {
    const clientId = req.params.client;
    CommConns.findByClientIdWithCommMetaData(clientId)
    .then((communications) => {
      // Filter out communications that are not type cell or landline
      // Why? We can't send voice messages to email
      communications = communications.filter((communication) => {
        let ok = false;
        if (communication.type == 'landline') ok = true;
        if (communication.type == 'cell') ok = true;
        return ok;
      });

      // Make sure that there is at least one communication method for voice
      // left after filtering through all communications
      if (communications.length) {
        res.render('voice/create', {
          communications,
        });

      // If no cell or landline options exist, then do not allow record
      } else {
        res.render('voice/noGoodNumbers');
      }
    }).catch(res.error500);
  },

  create(req, res) {
    // A phone number (cell of landline) needs to be selected
    // This is unlike texts which we allow for "Smart Select"
    // (which would mean commId being null in that notification row)
    const commId = req.body.commId;

    // Get the components of the scheduled date
    // and convert them to a date object (with toDate function)
    const deliveryDate = moment(req.body.sendDate)
                    .tz(res.locals.organization.tz)
                    .startOf('day')
                    .add(Number(req.body.sendHour), 'hours');

    // Get the phone number the user provided
    // Twilio will call this number to prompt recording
    let phoneNumber = req.body.phonenumber || '';
    phoneNumber = phoneNumber.replace(/[^0-9.]/g, '');

    if (phoneNumber.length == 10) {
      phoneNumber = `1${phoneNumber}`;
    }

    if (phoneNumber.length == 11) {
      res.render('voice/callComing', {
        userProvidedNumber: phoneNumber,
      });

      // User the voice library to prompt the call
      voice.recordVoiceMessage(
        req.user,
        commId,
        res.locals.client.clid,
        deliveryDate.toDate(),
        phoneNumber,
      );

    // If no good number is provided, prompt to re-enter
    } else {
      req.flash('warning', 'Phone number is not long enough.');

      // Context-sensitive redirect (org or caseload level)
      let redirectAddress = '/clients/';
      if (res.locals.level == 'org') {
        redirectAddress = `/org${redirectAddress}`;
      }
      redirectAddress = `${redirectAddress + res.locals.client.clid}/voicemessage`;

      // Submit redirect response
      res.redirect(redirectAddress);
    }
  },

};
