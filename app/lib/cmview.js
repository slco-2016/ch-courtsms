const db = require('../app/db');
const Promise = require('bluebird');

module.exports = {

  getConvo: function (cmid, clid, convid) {
    return new Promise (function (fulfill, reject) {
      db('clients').where('clid', clid).limit(1)
      .then(function (clients) {
        if (clients.length > 0) {
          const client = clients[0];  

          if (client.cm == cmid) {

            db('convos').where('convid', convid).limit(1)
            .then(function (convos) {

              if (convos.length > 0) {
                const convo = convos[0];  

                if (convo.cm == cmid) {

                  const rawQuery = 'SELECT msgs.content, msgs.inbound, msgs.read, msgs.tw_status, msgs.created, comms.type, comms.value, commconns.name FROM msgs ' + 
                                  ' JOIN (SELECT commconnid, comm, client, name FROM commconns WHERE commconns.commconnid IN (SELECT MIN(commconnid) FROM commconns ' + 
                                  ' WHERE commconns.comm IN (SELECT msgs.comm FROM msgs WHERE msgs.convo = ' + convid + ' AND commconns.client = ' + clid + ' GROUP BY msgs.comm) ' + 
                                  ' GROUP BY client, comm, client)) AS commconns ON (msgs.comm = commconns.comm) ' +
                                  ' LEFT JOIN comms ON (comms.commid = commconns.comm) WHERE msgs.convo = ' + convid + ' ORDER BY msgs.created ASC;';

                  db.raw(rawQuery).then(function (msgs) { 

                    db('comms')
                    .innerJoin('commconns', 'comms.commid', 'commconns.comm')
                    .where('commconns.client', clid)
                    .then(function (comms) {

                      fulfill({
                        cl: client,
                        convo: convo,
                        msgs: msgs.rows,
                        comms: comms,
                      });
                      
                    }).catch(function (err) { reject('500'); });
                  }).catch(function (err) { reject(err); });

                // actually not allowed to view
                } else { reject('404'); }

              // actually not allowed to view
              } else { reject('404'); }
            });

          } else { reject('404'); }
        } else { reject('404'); }
      }).catch(function (err) { reject(err); });
    });
  },



};