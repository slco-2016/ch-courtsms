'use strict';

// Libraries
const db      = require("../db");
const Promise = require("bluebird");

var twilio = require("twilio");
var twiml = new twilio.TwimlResponse();

const Clients = require("./clients");
const Conversations = require("./conversations");
const Communications = require("./communications");
const Messages = require("./messages");

function success_update (cm, cl) {
  var rawQuery2 = "UPDATE convos SET cm=" + cm + ", client=" + cl + ", accepted = TRUE WHERE convos.convid = (SELECT convos.convid FROM msgs INNER JOIN convos ON (msgs.convo = convos.convid) WHERE msgs.msgid=" + msg + ");";
  db.raw(rawQuery2).then(function (success) {

    var d = new Date();
    var ccName = "New Contact Method on " + String(d.getMonth() + 1) + "/" + d.getDate();
    var rawQuery3 = "INSERT INTO commconns (client, comm, name, created) VALUES (" + cl + ", (SELECT commid FROM comms WHERE comms.commid = (SELECT msgs.comm FROM msgs WHERE msgs.msgid = " + msg + ") LIMIT 1), '" + ccName + "', now())";
    db.raw(rawQuery3).then(function (success) {
      fulfill({state: false, msg: "Thanks! We have added this number to your contacts and forwarded the message on to your case manager."});

    }).catch(function (err) { reject(err); });
  }).catch(function (err) { reject(err); });
}

// Class
class Twilio {

  static log_sent_msg (msg, msgid) {
    return new Promise ((fulfill, reject) => {
      var rawQuery = "INSERT INTO msgs (convo, comm, content, inbound, read, created) VALUES ( (SELECT convo FROM msgs WHERE msgs.msgid = " + msgid + "), (SELECT comm FROM msgs WHERE msgs.msgid = " + msgid + "), '" + msg + "', FALSE, FALSE, now() );";
      db.raw(rawQuery).then(function (res) { fulfill(); }).catch(function (err) { reject(err); });
    });
  }

  static processIncoming (fromNumber, text, MessageStatus, MessageSID) {
    let communication, conversations;
    return new Promise ((fulfill, reject) => {
      Communications.getOrCreateFromValue(fromNumber, "cell")
      .then((comm) => {
        communication = comm;
        return Clients.findByCommId(comm.id);
      }).then((clients) => {
        return Conversations.findOrCreate(clients);
      }).then((convos) => {
        conversations = convos;
        let conversationIds = convos.map((conversation) => {
          return conversation.convid;
        });
        return Messages.createMany( conversationIds,
                                    communication.commid,
                                    text,
                                    MessageSID,
                                    MessageStatus);
      }).then((messages) => {
        conversations = conversations.map((conversation) => {
          messages.forEach(message) => {
            if (message.convo == conversation.convid) {
              conversation.messages = message;
            }
          });
          return conversation;
        });
        fulfill(conversations);
      }).catch(reject);
    });
  }

  static logIBMSensitivityAnalysis (m) {
    console.log("----------------------");
    console.log("msgs response received and ibm process");
    var ibm = null;

    // Check if we have IBM sentiment analysis
    if (m.hasOwnProperty("AddOns")) {
      try {
        m.AddOns = JSON.parse(m.AddOns);
      } catch (e) {
        m.AddOns = {status: null};
      }
      
      var s = m.AddOns.status;
      if (s && s=="successful") {
        var r = m.AddOns.results;
        if (r && r.hasOwnProperty("ibm_watson_sentiment")) {
          ibm = r.ibm_watson_sentiment;
        }
      }
    }

    if (ibm && ibm.status=="successful") {
      var requestSID = null;
      var docSentiment = null;

      try { 
        var type = ibm.result.docSentiment.type;
        var requestSID = ibm.request_sid;
        var tw_sid = m.MessageSid;

        var insertObj = {
          sentiment: type,
          ibm_request_sid: requestSID,
          tw_sid: tw_sid
        };

        db("ibm_sentiment_analysis")
        .insert(insertObj)
        .then(function (success) {
          console.log("Successfully logged sentiment analysis.");
        }).catch(function (err) {
          console.log("Error when isnerting on ibm_sentiment_analysis: ", err);
        })
        
      } catch (e) { console.log(e); }
    }
  }


  sms_guesser_logic_tree (state, text, msg) {
    var twiml = new twilio.TwimlResponse();
    return new Promise ((fulfill, reject) => {
      text = text.replace("-Sent free from TextNow.com", "");
      var name = text.replace(/["']/g, "").trim().split(" ");

      if (state == "initiate-resp") {
        if (name.length > 1) {
          var first = name[0];
          var last = name[name.length - 1];
          var rawQuery = "SELECT * FROM clients WHERE LOWER(first) LIKE LOWER('%" + first + "%') AND LOWER(last) LIKE LOWER('%" + last + "%') AND active=TRUE;";

          db.raw(rawQuery).then(function (res) {
            if (res.hasOwnProperty("rows")) { 

              // we found no one
              if (res.rows.length == 0) {
                var nameConcat = name.join(" ");
                fulfill({state: "initiate-resp", msg: "Sorry we do not have the name " + nameConcat + " in the system. Try again with a different name or wait for a case manager to assist you."});

              // we got the person, we know who it is
              } else if (res.rows.length == 1) {
                var person = res.rows[0];
                var cm = person.cm;
                var cl = person.clid;
                success_update(cm, cl);

              // we got more than one result
              } else {
                var st = "cmname-" + first + "-" + last;
                fulfill({state: st, msg: "Thanks, " + text + ". Can you also send the first and last name of your case manager, for example: SARAH MCKINSEY. Just the first name alone is also okay."});
              }
              
            } else { reject("Function logic_tree failed to return row values correctly.") };
          }).catch(function (err) { reject(err); });
        } else { fulfill({state: "initiate-resp", msg: "Please provide a first & last name, separated by a space. Example: JANE DOE"}); }

      } else if (state.indexOf("cmname-") == 0 && state.split("-").length) {
        var cl_first = state.split("-")[1];
        var cl_last = state.split("-")[2];
        var cm_first = name[0];
        var cm_last = name.length > 1 ? name[name.length - 1] : "";
        var rawQuery = "SELECT * FROM clients WHERE LOWER(first) LIKE LOWER('%" + 
                        cl_first + "%') AND LOWER(last) LIKE LOWER('%" + cl_last + 
                        "%') AND active = TRUE AND cm IN (SELECT cms.cmid FROM cms WHERE LOWER(first) LIKE LOWER('%" + 
                        cm_first + "%') AND LOWER(last) LIKE LOWER('%" + cm_last + 
                        "%') AND cms.cmid IN (SELECT clients.cm FROM clients WHERE LOWER(first) LIKE LOWER('%" + 
                        cl_first + "%') AND LOWER(last) LIKE LOWER('%" + cl_last + "%') AND active = TRUE));";

        db.raw(rawQuery).then(function (res) {

          // we are successful and have found a case manager
          if (res.hasOwnProperty("rows") && res.rows.length == 1) { 
            var cm = res.rows[0].cm;
            var cl = res.rows[0].clid;
            success_update(cm, cl);

          } else { fulfill({state: state, msg: "We couldn't find a specific case manager with that name. You can try again with a different name or wait for staff to assist you."}); };

        }).catch(function (err) { reject(err); });
      
      } else { reject("Unknown state supplied"); }
    });
  }

}

module.exports = Twilio;