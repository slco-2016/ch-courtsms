const Twilio = require('../models/twilio');

function sendResponse (msg, msgid) { 
  if (msg && msgid) {
    
    msg = String(msg).replace(/(\r\n|\n|\r)/gm,"");
    Twilio.log_sent_msg(msg, msgid).then(function () {
      let inner = "<Sms>" + msg + "</Sms>";
      res.send("<?xml version='1.0' encoding='UTF-8'?><Response>" + inner + "</Response>");
    }).catch(handleError);

  } else { res.send("<?xml version='1.0' encoding='UTF-8'?><Response></Response>"); }
};

function handleError (err) {
  let now = new Date(Date.now()).toISOString().split("T");
  console.log("Error occurred on " + now[0] + " at " + now[1] + ": " + err);
  res.status(404).send(err);
  return false;
};

module.exports = {

  receiveText(req, res) {

    try {
      let fromNumber = from.replace(/\D+/g, "");
      if (fromNumber.length == 10) { 
        from = "1" + from; 
      }
      let text = req.body.Body.replace(/["']/g, "").trim();
      let tw_status = req.body.SmsStatus;
      let tw_sid = req.body.MessageSid;

      // Log IBM Sensitivity measures
      Twilio.logIBMSensitivityAnalysis(req.body);
      
      Twilio.process_incoming_msg(fromNumber, text, tw_status, tw_sid)
      .then(function (msgs) {

        // we don't handle if multiple messages are created currently how that 
        // translates into new message logic we need to enhance later code to 
        // incorporate this
        if (msgs.length !== 1) {
          sendResponse();

        } else {
          let msg = msgs[0];
          Twilio.check_new_unknown_msg(msg).then(function (isNew) {
            
            // if new, then initiate figuring out who person is
            if (isNew) {
              req.session.ccstate = "initiate-resp";
              sendResponse("This # is not registered. Help us find you. Reply with your name in the following format: FIRST M LAST.", msg);

            // if ongoing auto convo, then continue
            } else if (req.session.hasOwnProperty("ccstate") && req.session.ccstate) { 
              Twilio.sms_guesser_logic_tree(req.session.ccstate, req.body.Body, msg).then(function (response) {
                req.session.ccstate = response.state;
                sendResponse(response.msg, msg);
              }).catch(handleError);

            // see if the person has not been serviced in a long time
            } else { 
              
              // check when last response was
              Twilio.check_last_unread(msg).then(function (unreadDate) {
                if (unreadDate) {
                  try {
                    let d1 = new Date(unreadDate);
                    let d2 = new Date();
                    let diff = (d2.getTime() - d1.getTime()) / (3600*1000);
                    
                    // if it's been more than 4 hours let's notify the case manager
                    if (diff > 4) {
                      // ... but only if it is not a weekend
                      if (d2.getDay() == 6 || d2.getDay() == 0) {
                        sendResponse("Message received! Because it is the weekend, your case manager may take until the next business day to respond. Thanks for your patience.", msg);
                      } else {
                        sendResponse("Message received! As it has been over 4 hours and your case manager has not yet addressed your prior message so we sent them a reminder to get back to you!", msg);
                        // notify the case manager now...
                      }
                    } else { 
                      sendResponse(); 
                    }

                  } catch (e) { sendResponse(); }
                } else { sendResponse(); }
              }).catch(handleError);
            }
          }).catch(handleError);
        }

        // log message being received
        let now = new Date(Date.now()).toISOString().split("T");
        console.log("Message received from " + fromNumber + " on " + now[0] + " at " + now[1]);

      }).catch(handleError);
    
    } catch (e) {
      console.log("Error with SMS POST: ", e)
      console.log(e.trace)
    };
  },

  receiveVoice(req, res) {
    res.send(`<?xml version='1.0' encoding='UTF-8'?>
              <Response>
                <Say voice='woman'>
                  Client Comm is a text only number currently. 
                  Please dial 385-468-3500 for the front desk and ask for your case manager.
                </Say>
              </Response>
            `);
  },

};