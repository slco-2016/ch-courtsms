var twilio = require("twilio");
var sms = require("../utils/utils.js")["sms"];
var smsguess = require("../utils/utils.js")["smsguessuser"];

module.exports = function (app) {

  app.post("/sms", function (req, res) {

    try {
      var from = sms.clean_phonenum(req.body.From);
      var to = sms.clean_phonenum(req.body.To);
      var text = req.body.Body;

      var tw_status = req.body.SmsStatus;
      var tw_sid = req.body.MessageSid;

      // just leaving this in for now while we use free service for testing
      text = text.replace("-Sent free from TextNow.com", "");

      // clean up the text string
      text = text.replace(/["']/g, "").trim();

      // we used to break up the text into a list of 160 char each but now we can support longer ones
      // still need to submit as a list
      text = [text];

      // Log IBM Sensitivity measures
      sms.logIBMSensitivityAnalysis(req.body);
      
      sms.process_incoming_msg(from, to, text, 'cell', tw_status, tw_sid)
      .then(function (msgs) {

        // we don't handle if multiple messages are created currently how that translates into new message logic
        // we need to enhance later code to incorporate this
        if (msgs.length !== 1) {
          sendResponse();

        } else {
          var msg = msgs[0];
          sms.check_new_unknown_msg(msg).then(function (isNew) {
            
            // if new, then initiate figuring out who person is
            if (isNew) {
              req.session.ccstate = "initiate-resp";
              sendResponse("This # is not registered. Help us find you. Reply with your name in the following format: FIRST M LAST.", msg);

            // if ongoing auto convo, then continue
            } else if (req.session.hasOwnProperty("ccstate") && req.session.ccstate) { 
              smsguess.logic_tree(req.session.ccstate, req.body.Body, msg).then(function (response) {
                req.session.ccstate = response.state;
                sendResponse(response.msg, msg);
              }).catch(function (err) { handleError(err); });

            // see if the person has not been serviced in a long time
            } else { 
              
              // check when last response was
              sms.check_last_unread(msg).then(function (unreadDate) {
                if (unreadDate) {
                  try {
                    var d1 = new Date(unreadDate);
                    var d2 = new Date();
                    var diff = (d2.getTime() - d1.getTime()) / (3600*1000);
                    
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
              }).catch(function (err) { handleError(err); });
            }
          }).catch(function (err) { handleError(err); });
        }

        // log message being received
        var now = new Date(Date.now()).toISOString().split("T");
        console.log("Message received from " + from + " on " + now[0] + " at " + now[1]);

      }).catch(function (err) { handleError(err); });
    } catch (e) {
      console.log("Error with SMS POST: ", e)
    };

    function sendResponse (msg, msgid) { 
      if (msg && msgid) {
        
        msg = String(msg).replace(/(\r\n|\n|\r)/gm,"");
        sms.log_sent_msg(msg, msgid).then(function () {
          var inner = "<Sms>" + msg + "</Sms>";
          res.send("<?xml version='1.0' encoding='UTF-8'?><Response>" + inner + "</Response>");
        }).catch(function (err) { handleError(err); });

      } else { res.send("<?xml version='1.0' encoding='UTF-8'?><Response></Response>"); }
    };

    function handleError (err) {
      var now = new Date(Date.now()).toISOString().split("T");
      console.log("Error occurred on " + now[0] + " at " + now[1] + ": " + err);
      res.status(404).send(err);
      return false;
    };

  });

};
