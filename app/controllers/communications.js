const Notifications = require('../models/notifications');
const Clients = require('../models/clients');
const Templates = require('../models/templates');
const CommConns = require('../models/commConns');

module.exports = {
  index(req, res) {
    let client = req.params.client;
    CommConns.getClientCommunications(client)
    .then((comms) => {
      if (comms.length == 0) {
        res.redirect(`/clients/${client}/communications/create`);
      } else {
        res.render("clients/communications", {
          hub: {
            tab: "contactMethods",
            sel: null
          },
          communications: comms
        });
      }
    }).catch(res.error500);
  },

  new(req, res) {
    res.render("clients/commConn");
  },

  create(req, res) {
    let client = req.params.client;
    let name   = req.body.description;
    let type   = req.body.type;
    let value  = req.body.value;

    // clean up numbers
    if (type == "cell" || type == "landline") {
      value = value.replace(/[^0-9.]/g, "");
      if (value.length == 10) { value = "1" + value; }
    }

    CommConns.createOne(client, type, name, value)
    .then(() => {
      logClientActivity(client);
      req.flash("success", "Created new communication method.");
      res.redirect(`/clients/${client}/communications`);
    }).catch(res.error500);
  },

  remove(req, res) {
    let client = req.params.client;
    let comm = req.params.communication;
    CommConns.findByClientID(client)
    .then((commConns) => {
      if (commConns.length > 1) {
        Communications.removeOne(comm)
        .then(() => {
          req.flash("success", "Removed communication method.");
          res.redirect(`/clients/${client}/communications`);
        }).catch(res.error500);

      } else {
        req.flash("warning", "Can't remove the only remaining communication method.");
        res.redirect(`/clients/${client}/communications`);
      }
    })
  }
}