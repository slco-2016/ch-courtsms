var db = require("../server/db");
var Promise = require("bluebird");

const s3 = require("../utils/s3")

module.exports = {

  getConvo: function (cmid, clid, convid) {
    return new Promise (function (fulfill, reject) {
      let obj = {}

      db("clients").where("clid", clid).limit(1)
      .then(function (clients) {
        if (clients.length < 1) {
          throw "404"
        }
        obj.cl = clients[0];

        if (obj.cl.cm != cmid) {
          throw "404"
        }
        return db("convos").where("convid", convid).limit(1)
      }).then(function (convos) {

        if (convos.length < 1) {
          throw "404"
        }

        obj.convo = convos[0];

        if (obj.convo.cm != cmid) {
          throw "404"
        }
        var rawQuery = `
          SELECT
            msgs.content,
            msgs.inbound,
            msgs.read,
            msgs.tw_status,
            msgs.created,
            msgs.msgid,
            comms.type,
            comms.value,
            commconns.name
          FROM msgs
          JOIN (
            SELECT commconnid, comm, client, name FROM commconns WHERE commconns.commconnid IN (
              SELECT MIN(commconnid) FROM commconns WHERE commconns.comm IN (
                SELECT msgs.comm FROM msgs WHERE msgs.convo = ${convid} AND commconns.client = ${clid} GROUP BY msgs.comm
              ) GROUP BY client, comm, client
            )
          ) AS commconns ON (msgs.comm = commconns.comm)
          LEFT JOIN comms ON (comms.commid = commconns.comm)
          WHERE msgs.convo = ${convid} ORDER BY msgs.created ASC;
        `
        return db.raw(rawQuery)

      }).then(function (msgs) {
        
        obj.msgs = msgs.rows 

        return db("comms")
        .innerJoin("commconns", "comms.commid", "commconns.comm")
        .where("commconns.client", clid)

      }).then(function (comms) {
        
        obj.comms = comms

        let msgids = []
        obj.msgs.map((msg) => {
          msgids.push(msg.msgid)
        })

        return db("attachments")
        .whereIn("msg_id", msgids)

      }).then((attachments) => {

        attachments.map((attachment) => {
          attachment.url = s3.getTemporaryUrl(attachment.key)
        })

        obj.attachments = attachments

        fulfill(obj);

      }).catch((err) => {
        reject(err)
      });
    });
  },
}