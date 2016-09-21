const Groups = require('../models/groups');
const Clients = require('../models/clients');

module.exports = {

  index(req, res) {
    let status = req.query.status === "deleted" ? false : true;

    Groups.findByUser(req.user.cmid, status)
    .then((groups) => {
      res.render("groups/index", {
        hub: {
          tab: "groups",
          sel: status ? "current" : "deleted"
        },
        groups: groups
      });
    }).catch(res.error500);
  },

  new(req, res) {
    Clients.findByUser(Number(req.user.cmid), true)
    .then((clients) => {
        res.render("groups/create", {
          clients: clients
        });
    }).catch(res.error500);
  },

  create(req, res) {
    let userID = Number(req.user.cmid);
    let name = req.body.name;
    let clientIDs = req.body.clientIDs;
    Groups.insertNew(userID, name, clientIDs)
    .then(() => {
      req.flash("success", "Created new group.");
      res.redirect(`/groups`);
    }).catch(res.error500);
  },

  edit(req, res) {
    Groups.findByID(Number(req.params.group))
    .then((group) => {
      if (group) {
        Clients.findByUser(Number(req.user.cmid), true)
        .then((clients) => {
          res.render("groups/edit", {
            group: group,
            clients: clients
          });
        }).catch(res.error500);
      } else {
        notFound(res);
      }
    }).catch(res.error500);
  },

  update(req, res) {
    let userID = req.user.cmid;
    let groupId = req.params.group;
    let name = req.body.name;

    // Clean clientIDs
    let clientIDs = req.body.clientIDs;
    if (!clientIDs) clientIDs = [];
    if (typeof clientIDs == "string") clientIDs = isNaN(Number(clientIDs)) ? [] : Number(clientIDs);
    if (typeof clientIDs == "number") clientIDs = [clientIDs];
    if (Array.isArray(clientIDs)) {
      clientIDs
      .map(function (ID) { return Number(ID); })
      .filter(function (ID) { return !(isNaN(ID)); });
      Groups.editOne(userID, groupId, name, clientIDs)
      .then(() => {
        req.flash("success", "Edited group.");
        res.redirect(`/groups`);
      }).catch(res.error500);
    } else {
      notFound(res);
    }
  },

  destroy(req, res) {
    Groups.removeOne(Number(req.params.group))
    .then(() => {
      res.redirect(`/groups`);
    }).catch(res.error500);
  },

  activate(req, res) {
    Groups.activateOne(Number(req.params.group))
    .then(() => {
      res.redirect(`/groups`);
    }).catch(res.error500);
  },

  address(req, res) {
    res.render("groups/address", {
      parameters: req.params
    });
  },

  addressUpdate(req, res) {
    let userID = req.user.cmid;
    let groupId = Number(req.params.group);
    let title = req.body.title;
    let content = req.body.content;

    if (title == "") title = "New Conversation";

    Groups.addressMembers(userID, groupId, title, content)
    .then(() => {
      req.flash("success", "Messaged group members.");
      res.redirect(`/groups`);
    }).catch(res.error500);
  },
  
}