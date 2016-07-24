var db  = require("../server/db");
var Promise = require("bluebird");

module.exports = {

  check_new_unknown_msg: function (msg) {
    return new Promise (function (fulfill, reject) {
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

  check_last_unread: function (msg) {
    return new Promise (function (fulfill, reject) {
      var rawQuery = "SELECT created FROM msgs WHERE msgs.convo IN (SELECT convos.convid FROM msgs INNER JOIN convos ON (msgs.convo = convos.convid) WHERE msgs.msgid = " + msg + ") AND inbound = TRUE AND read = FALSE ORDER BY created DESC LIMIT 1;";
      db.raw(rawQuery).then(function (res) {
        if (res.hasOwnProperty("rows")) { 
          if (res.rows.length == 1 && res.rows[0].hasOwnProperty("created")) { fulfill(res.rows[0].created); }
          else { fulfill(false); }
        } else { reject("Function check_last_unread failed to return row values correctly.") };
      }).catch(function (err) { reject(err); });
    });
  },

  log_sent_msg: function (msg, msgid) {
    return new Promise (function (fulfill, reject) {
      var rawQuery = "INSERT INTO msgs (convo, comm, content, inbound, read, created) VALUES ( (SELECT convo FROM msgs WHERE msgs.msgid = " + msgid + "), (SELECT comm FROM msgs WHERE msgs.msgid = " + msgid + "), '" + msg + "', FALSE, FALSE, now() );";
      db.raw(rawQuery).then(function (res) { fulfill(); }).catch(function (err) { reject(err); });
    });
  },

  process_incoming_msg: function (from, text, type, tw_status, tw_sid) {
    var sms = this;
    return new Promise (function (fulfill, reject) {

      var commid;

      // step 1: see if comm device exists
      sms.get_or_create_comm_device(from, type).then(get_clients).catch(errReject);
      

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

  clean_phonenum: function (from) {
    if (from) {
      from = from.replace(/\D+/g, "");
      if (from.length == 10) { from = "1" + from; }

      if (from.length == 11) { return from;
      } else { return null; }

    } else { return null; }
  },
  
  get_or_create_comm_device: function (from, type) {
    return new Promise (function (fulfill, reject) {
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
            "type": type,
            "value": from,
            "description": description
          }).then(fulfill).catch(reject);
        }

      }).catch(function (err) { reject(err); });
    });
  },
  
  get_clients: function (commid) {
    return new Promise (function (fulfill, reject) {
      var rawQuery = "SELECT clients.clid, clients.cm FROM clients JOIN (SELECT * FROM commconns WHERE commconns.comm = " + commid + 
                      ") AS commconns ON (commconns.client = clients.clid AND commconns.comm = " + commid + 
                      " AND commconns.retired IS NULL) GROUP BY clid, cm;";

      db.raw(rawQuery).then(function (res) {
        var clients = res.rows.map(function (ea) { return {clid: ea.clid, cmid: ea.cm}; });
        if (clients.length == 0) { clients = [{clid: null, cmid: null}]; }
        console.log("Cient", clients, commid);
        fulfill(clients);

      }).catch(function (err) { reject(err); });
    });
  },
  
  get_or_create_convos: function (clients, commid, from) {
    return new Promise (function (fulfill, reject) {
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

  register_message: function (text, commid, convos, tw_status, tw_sid) {
    console.log("commid: ", commid);
    console.log("convos: ", convos);

    return new Promise (function (fulfill, reject) {
      var insertList = [];
      for (var i = 0; i < convos.length; i++) {
        var convo = convos[i];
        for (var txt_i = 0; txt_i < text.length; txt_i++) {
          var textPart = text[txt_i];

          var insertObj = {
            "convo": convo,
            "comm": commid,
            "content": textPart,
            "inbound": true,
            "read": false,
            "tw_sid": tw_sid,
            "tw_status": tw_status
          }
          insertList.push(insertObj);         
        }
      }

      console.log("insertList", insertList);

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
  }

}




