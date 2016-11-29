const Notifications = require('../models/notifications');
const Clients = require('../models/clients');
const Communications = require('../models/communications');
const CommConns = require('../models/commConns');
const Templates = require('../models/templates');


module.exports = {

  index(req, res) {
    const client = req.params.client;
    CommConns.getClientCommunications(client)
    .then((comms) => {
      if (comms.length == 0) {
        res.redirect(`/clients/${client}/communications/create`);
      } else {
        res.render('clients/communications', {
          hub: {
            tab: 'contactMethods',
            sel: null,
          },
          communications: comms,
        });
      }
    }).catch(res.error500);
  },

  new(req, res) {
    res.render('clients/commConn', {
      commConn: {},
    });
  },

  create(req, res) {
    const override = req.body.override;
    const client = req.params.client;
    const description = req.body.description;
    const type = req.body.type;
    let value = req.body.value;

    // clean up numbers
    if (type == 'cell' || type == 'landline') {
      // make sure that value is a string (might have been submitted as integer)
      if (typeof value !== 'string') value = String(value);

      value = value.replace(/[^0-9.]/g, '');
      if (value.length == 10) { value = '1' + value; }
    }

    // First check if this client already has this commConn
    CommConns.findByClientIdWithCommMetaData(client)
    .then((commConns) => {
      commConns = commConns.filter((commConn) => {
        return String(value) === String(commConn.value);
      });
      if (commConns.length > 0) {
        const currentCommConn = commConns[0];
        if (currentCommConn.name !== description) {
          CommConns.updateCommConnName(currentCommConn.commconnid, description)
          .then(() => {
            req.flash('success', 'Updated the communication name.');
            res.redirect(`/clients/${client}/communications`);
          }).catch(res.error500);
        } else {
          req.flash('warning', 'Client already has that method.');
          res.redirect(`/clients/${client}/communications`);
        }
      } else {
        CommConns.create(client, type, description, value)
        .then(() => {

          // Perform an "override" in that prior version of contact is removed
          // only do this if being directed from the edit view, and it is marked
          if (override) {
            CommConns.findByClientIdWithCommMetaData(client)
            .then((commConns) => {
              if (commConns.length > 1) {
                Communications.removeOne(override)
                .then(() => {}).catch();
              }
            }).catch();
          }

          req.logActivity.client(client);
          req.flash('success', 'Created new communication method.');
          res.redirect(`/clients/${client}/communications`);
          return null;
        }).catch(res.error500);
      }
      return null;
    }).catch(res.error500);
  },

  edit(req, res) {
    CommConns.findById(req.params.communication)
    .then((commConn) => {
      res.render('clients/commConn', {
        commConn: commConn,
      });
    }).catch(res.error500);
  },

  remove(req, res) {
    const client = req.params.client;
    const comm = req.params.communication;
    CommConns.findByClientIdWithCommMetaData(client)
    .then((commConns) => {
      if (commConns.length > 1) {
        Communications.removeOne(comm)
        .then(() => {
          req.flash('success', 'Removed communication method.');
          res.redirect(`/clients/${client}/communications`);
        }).catch(res.error500);

      } else {
        req.flash('warning', 'Can\'t remove the only remaining communication method.');
        res.redirect(`/clients/${client}/communications`);
      }
    });
  },
};