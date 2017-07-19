const Groups = require('../models/groups');
const Clients = require('../models/clients');

module.exports = {

  index(req, res) {
    const status = req.query.status !== 'deleted';

    Groups.findByUser(req.user.cmid, status)
    .then((groups) => {
      res.render('groups/index', {
        hub: {
          tab: 'groups',
          sel: status ? 'current' : 'deleted',
        },
        groups,
      });
    }).catch(res.error500);
  },

  new(req, res) {
    Clients.findByUser(Number(req.user.cmid), true)
    .then((clients) => {
      res.render('groups/create', {
        clients: clients,
        csrfToken: req.csrfToken(),
      });
    }).catch(res.error500);
  },

  create(req, res) {
    const userID = Number(req.user.cmid);
    const name = req.body.name;
    const clientIDs = req.body.clientIDs;
    Groups.insertNew(userID, name, clientIDs)
    .then(() => {
      req.flash('success', 'Created new group.');
      res.redirect('/groups');
    }).catch(res.error500);
  },

  edit(req, res) {
    Groups.findByID(Number(req.params.group))
    .then((group) => {
      if (group) {
        Clients.findByUser(Number(req.user.cmid), true)
        .then((clients) => {
          res.render('groups/edit', {
            group: group,
            clients: clients,
            csrfToken: req.csrfToken(),
          });
        }).catch(res.error500);
      } else {
        notFound(res);
      }
    }).catch(res.error500);
  },

  update(req, res) {
    const userID = req.user.cmid;
    const groupId = req.params.group;
    const name = req.body.name;

    // Clean clientIDs
    let clientIDs = req.body.clientIDs;
    if (!clientIDs) clientIDs = [];
    if (typeof clientIDs === 'string') clientIDs = isNaN(Number(clientIDs)) ? [] : Number(clientIDs);
    if (typeof clientIDs === 'number') clientIDs = [clientIDs,];
    if (Array.isArray(clientIDs)) {
      clientIDs
      .map(ID => Number(ID))
      .filter(ID => !(isNaN(ID)));
      Groups.editOne(userID, groupId, name, clientIDs)
      .then(() => {
        req.flash('success', 'Edited group.');
        res.redirect('/groups');
      }).catch(res.error500);
    } else {
      notFound(res);
    }
  },

  destroy(req, res) {
    Groups.removeOne(Number(req.params.group))
    .then(() => {
      res.redirect('/groups');
    }).catch(res.error500);
  },

  activate(req, res) {
    Groups.activateOne(Number(req.params.group))
    .then(() => {
      res.redirect('/groups');
    }).catch(res.error500);
  },

  address(req, res) {
    res.render('groups/address', {
      parameters: req.params,
      csrfToken: req.csrfToken(),
    });
  },

  addressUpdate(req, res) {
    const userID = req.user.cmid;
    const groupId = Number(req.params.group);
    let title = req.body.title;
    const content = req.body.content;

    if (title == '') title = 'New Conversation';

    Groups.addressMembers(userID, groupId, title, content)
    .then(() => {
      req.flash('success', 'Messaged group members.');
      res.redirect('/groups');
    }).catch(res.error500);
  },

};
