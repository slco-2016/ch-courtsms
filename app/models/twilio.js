'use strict';

// Libraries
const db      = require("../db");
const Promise = require("bluebird");

var twilio = require("twilio");
var twiml = new twilio.TwimlResponse();

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

  static check_new_unknown_msg (msg) {
    return new Promise ((fulfill, reject) => {
      var rawQuery = "SELECT COUNT(msgs.msgid) FROM msgs WHERE msgs.convo IN (SELECT convos.convid FROM msgs INNER JOIN convos ON (msgs.convo = convos.convid) WHERE msgs.msgid = " + msg + " AND convos.client IS NULL);"
      db.raw(rawQuery).then(function (res) { 
        if (res.hasOwnProperty("rows") && res.rows.length == 1 && res.rows[0].hasOwnProperty("count")) { 
          var count = Number(res.rows[0].count);
          if (isNaN(count)) reject(res.rows[0].count + "  - (res.rows[0].count) is not convertable into a number");
          else fulfill(count == 1); 
        } else { reject("Function check_new_unknown_msg failed to return row values correctly.") };
      }).catch(function (err) { reject(err); });
    });
  },

  static check_last_unread (msg) {
    return new Promise ((fulfill, reject) => {
      var rawQuery = "SELECT created FROM msgs WHERE msgs.convo IN (SELECT convos.convid FROM msgs INNER JOIN convos ON (msgs.convo = convos.convid) WHERE msgs.msgid = " + msg + ") AND inbound = TRUE AND read = FALSE ORDER BY created DESC LIMIT 1;";
      db.raw(rawQuery).then(function (res) {
        if (res.hasOwnProperty("rows")) { 
          if (res.rows.length == 1 && res.rows[0].hasOwnProperty("created")) { fulfill(res.rows[0].created); }
          else { fulfill(false); }
        } else { reject("Function check_last_unread failed to return row values correctly.") };
      }).catch(function (err) { reject(err); });
    });
  },

  static log_sent_msg (msg, msgid) {
    return new Promise ((fulfill, reject) => {
      var rawQuery = "INSERT INTO msgs (convo, comm, content, inbound, read, created) VALUES ( (SELECT convo FROM msgs WHERE msgs.msgid = " + msgid + "), (SELECT comm FROM msgs WHERE msgs.msgid = " + msgid + "), '" + msg + "', FALSE, FALSE, now() );";
      db.raw(rawQuery).then(function (res) { fulfill(); }).catch(function (err) { reject(err); });
    });
  },

  static process_incoming_msg (from, text, tw_status, tw_sid) {
    var sms = this;
    return new Promise ((fulfill, reject) => {

      var commid;

      // step 1: see if comm device exists
      sms.get_or_create_comm_device(from).then(get_clients).catch(errReject);
      

      // step 2: get clients associated with that device
      function get_clients (device) {
        if (device.length > 0) {
          commid = device[0];
          sms.get_clients(commid).then(get_or_create_convos).catch(errReject)
        } else { errReject("No devices were found or created for this number."); }
      };

      // step 3: find open conversations for each client
      function get_or_create_convos (clients) {
        if (clients.length > 0) {
          sms.get_or_create_convos(clients, commid, from).then(register_message).catch(errReject)
        } else { errReject("Failed to produce or create at least one client object in function get_clients."); }
      };

      // step 4: add messages to those conversations
      function register_message (convos) {
        if (convos.length > 0) {
          sms.register_message(text, commid, convos, tw_status, tw_sid).then(fulfill).catch(errReject)
        } else { errReject("Failed to register message."); }
      };

      // error handling
      function errReject (err) { reject(String(err)); };

    });
  },

  static clean_phonenum (from) {
    if (from) {
      from = from.replace(/\D+/g, "");
      if (from.length == 10) { from = "1" + from; }

      if (from.length == 11) { return from;
      } else { return null; }

    } else { return null; }
  },
  
  static get_or_create_comm_device (from) {
    return new Promise ((fulfill, reject) => {
      // acquire commid
      db.select("commid").from("comms").where("value", from).limit(1)
      .then(function (comms) {

        // return list of comms
        if (comms.length > 0) {
          comms = comms.map(function (ea) { return ea.commid; });
          fulfill(comms);

        // create and return a comm
        } else {
          var today = new Date(Date.now()).toISOString().split("T")[0];
          var description = "Unknown device (created " + today + ")";

          db("comms")
          .returning("commid")
          .insert({
            "type": "cell",
            "value": from,
            "description": description
          }).then(function (commid) {
            fulfill(commid);
          }).catch(function (err) { reject(err); });
        }

      }).catch(function (err) { reject(err); });
    });
  },
  
  static get_clients (commid) {
    return new Promise ((fulfill, reject) => {
      var rawQuery = "SELECT clients.clid, clients.cm FROM clients JOIN (SELECT * FROM commconns WHERE commconns.comm = " + commid + 
                      ") AS commconns ON (commconns.client = clients.clid AND commconns.comm = " + commid + 
                      " AND commconns.retired IS NULL) GROUP BY clid, cm;";

      db.raw(rawQuery).then(function (res) {
        var clients = res.rows.map(function (ea) { return {clid: ea.clid, cmid: ea.cm}; });
        if (clients.length == 0) { clients = [{clid: null, cmid: null}]; }
        fulfill(clients);

      }).catch(function (err) { reject(err); });
    });
  },
  
  static get_or_create_convos (clients, commid, from) {
    return new Promise ((fulfill, reject) => {
      var cls = clients.map(function (ea) { return ea.clid; });
      var cms = clients.map(function (ea) { return ea.cmid; });

      var d, raw = false;

      // search for null values as well is null is in list as a convo type
      if (cls.indexOf(null) > -1 && cls.length == 1) {
        raw = true;
        var rawQuery =  "SELECT * FROM convos WHERE convos.convid IN (SELECT msgs.convo FROM msgs WHERE msgs.convo IN " + 
                        " (SELECT convos.convid FROM convos WHERE client IS NULL AND convos.open = TRUE) AND msgs.comm = " + commid + 
                        " GROUP BY msgs.convo) AND convos.open = TRUE;";
        d = db.raw(rawQuery);

      } else {
        d = db("convos")
        d.whereIn("client", cls);
        d.andWhere("convos.open", true);
      }

      d.then(function (convos) {

        // clean up response
        if (raw) convos = convos.rows;
        convos = convos.map(function (ea) { return ea.convid; });

        // there are existing open conversations
        if (convos.length > 0) {
          fulfill(convos);

        // we need to check if there is an unlinked convo associated to this 
        } else {

          db.select("convos.convid").from("comms")
          .innerJoin("msgs", "comms.commid", "msgs.comm")
          .innerJoin("convos", "msgs.convo", "convos.convid")
          .where("convos.open", true)
          .andWhere("comms.value", from)
          .andWhere("convos.cm", null)
          .andWhere("convos.client", null)
          .groupBy("convos.convid")
          .then(function (convos) {

            // there are existing open conversations
            if (convos.length > 0) {
              convos = convos.map(function (ea) { return ea.convid; });
              fulfill(convos);

            } else {

              // just in case [null] value was not submitted for clients in lieu of none
              if (clients.length == 0) { clients = [{clid: null, cmid: null}]; }

              var insertList = [];
              var now = new Date(Date.now()).toISOString().split("T");
              var subject = "New Convo " + now[0] + " at " + now[1].replace("Z", "");

              for (var i = 0; i < clients.length; i++) {
                var client = clients[i];
                var insertObj = {
                  "cm": client.cmid,
                  "client": client.clid,
                  "subject": subject,
                  "open": true,
                  "accepted": false
                }
                insertList.push(insertObj);
              }

              db("convos")
              .insert(insertList)
              .returning("convid")
              .then(function (convos) {
                fulfill(convos);
              }).catch(function (err) { reject(err); });
            }

          }).catch(function (err) { reject(err); });

        }
      }).catch(function (err) { reject(err); });
    });
  },

  static register_message (text, commid, convos, tw_status, tw_sid) {

    return new Promise ((fulfill, reject) => {
      var insertList = [];
      for (var i = 0; i < convos.length; i++) {
        var convo = convos[i];
        for (var txt_i = 0; txt_i < text.length; txt_i++) {
          var textPart = text[txt_i];

          var insertObj = {
            "convo":     convo,
            "comm":      commid,
            "content":   textPart,
            "inbound":   true,
            "read":      false,
            "tw_sid":    tw_sid,
            "tw_status": tw_status
          }
          insertList.push(insertObj);         
        }
      }

      db("msgs")
      .insert(insertList)
      .returning("msgid")
      .then(function (msgs) {

        db("convos").whereIn("convid", convos)
        .update({updated: db.fn.now()})
        .then(function (success) {
          fulfill(msgs);
        }).catch(function (err) {
          reject(err);
        })

      }).catch(function (err) {
        reject(err);
      });
    });
  },

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