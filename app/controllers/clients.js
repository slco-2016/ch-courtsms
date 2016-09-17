const Clients = require('../models/clients');
const Client = require('../models/client');
const Messages = require('../models/messages');
const Users = require('../models/users');

function _getUser (req, res) {
  let userId = res.locals.client.cm;
  if (res.locals.level == "user") {
    userId = req.user.cmid;
  }
  return userId;
};

module.exports = {
  
  index(req, res) {
    let status      = req.query.status == "closed" ? false : true;
    let department  = req.user.department || req.query.departmentId;

    // Controls against a case where the owner would accidentally have a department
    if (req.user.class === "owner" && !req.query.departmentId) {
      department = null;
    }

    let method;
    if (department) {
      method = Clients.findByDepartment(department, status);
    } else {
      method = Clients.findByOrg(req.user.org, status);
    }

    method.then((clients) => {
      if (req.query.limitByUser) {
        clients = clients.filter((c) => {
          return Number(c.cm) === Number(req.query.limitByUser);
        });
      }

      res.render("clients/index", {
        hub: {
          tab: "clients",
          sel: status ? "open" : "closed"
        },
        clients: clients,
        limitByUser: req.query.limitByUser || null
      });
    }).catch(res.error500);
  },

  new(req, res) {
    Users.findByOrg(req.user.org)
    .then((users) => {
      if (req.user.department) {
        users = users.filter((u) => { return u.department == req.user.department });
      }
      res.render("clients/create", {
        users: users
      });
    }).catch(res.error500);
  },

  create(req, res) {
    let userId = req.body.targetUser || req.user.cmid; // Will this work consistently?
    let first  = req.body.first;    
    let middle = req.body.middle ? req.body.middle : "";    
    let last   = req.body.last;   
    let dob    = req.body.dob;    
    let so     = req.body.uniqueID1 ? req.body.uniqueID1 : null;    
    let otn    = req.body.uniqueID2 ? req.body.uniqueID2 : null;

    Client.create(
            userId, 
            first, 
            middle, 
            last, 
            dob, 
            so,  // note these should be renamed
            otn  // this one as well
    ).then(() => {
      res.redirect(`${req.locals.level === "org" ? "/org" : ""}/clients`);
    }).catch(res.error500);
  },

  edit(req, res) {
    res.render("clients/edit");
  },

  update(req, res) { 
    let client  = req.params.client;
    let first     = req.body.first;
    let middle    = req.body.middle;
    let last      = req.body.last;
    let dob       = req.body.dob;
    let so        = req.body.uniqueID1;
    let otn       = req.body.uniqueID2;
    Client.editOne(
            client, 
            first, 
            middle, 
            last, 
            dob, 
            so, 
            otn
    ).then(() => {
      req.logActivity.client(client);
      req.flash("success", "Edited client.");
      res.redirect(`${req.locals.level === "org" ? "/org" : ""}/clients`);
    }).catch(res.error500);
  },

  addressCraft(req, res) {
    res.render("clients/address", {
      template: req.query
    });
  },

  addressSubmit(req, res) {
    let userId   = res.locals.client.cm;
    if (res.locals.level == "user") {
      userId = req.user.cmid;
    }

    let client = req.params.client;
    let subject  = req.body.subject;
    let content  = req.body.content;
    let commID   = req.body.commID == "null" ? null : req.body.commID;
    let method;

    if (commID) {
      method = Messages.startNewConversation(userId, client, subject, content, commID);
    } else {
      method = Messages.smartSend(userId, client, subject, content);
    }

    method.then(() => {
      req.logActivity.client(client);
      req.flash("success", "Message to client sent.");
      res.redirect(`${req.locals.level === "org" ? "/org" : ""}/clients`);
    }).catch(res.error500);
  },

  messageCraft(req, res) {
    let methodFilter = "all";
    if (req.query.method == "texts") methodFilter = "cell";

    let convoFilter = Number(req.query.conversation);
    if (isNaN(convoFilter)) convoFilter = null;

    let conversations, messages;
    Conversations.findByUserAndClient(req.user.cmid, req.params.client)
    .then((convos) => {
      conversations = convos;
      return Messages.findByClientID(req.user.cmid, req.params.client)
    }).then((msgs) => {
      messages = msgs.filter((msg) => {
        if (msg.comm_type == methodFilter || methodFilter == "all") {
          if (msg.convo == convoFilter || convoFilter == null) return true;
          else return false;

        } else { 
          return false; 
        }
      });
      return CommConns.findByClientID(req.params.client)
    }).then((communications) => {
      res.render("clients/messages", {
        hub: {
          tab: "messages",
          sel: req.query.method ? req.query.method : "all"
        },
        conversations: conversations,
        messages: messages,
        communications: communications,
        convoFilter: convoFilter
      });
    }).catch(res.error500);
  },

  messageSubmit(req, res) {
    let client = req.params.client;
    let subject  = "New Conversation";
    let content  = req.body.content;
    let commID   = req.body.commID;

    Conversations.getMostRecentConversation(req.user.cmid, client)
    .then((conversation) => {
      // Use existing conversation if exists and recent (lt 5 days)
      var now, lastUpdated, recentOkay = false;
      if (conversation) {
        now = new Date().getTime() - (5 * 24 * 60 * 60 * 1000); // 5 days in past
        lastUpdated = new Date(conversation.updated).getTime();
        recentOkay = lastUpdated > now;
      }

      if (conversation && recentOkay) {
        Messages.sendOne(commID, content, conversation.convid)
        .then(() => {
          req.logActivity.client(client);
          req.logActivity.conversation(conversation.convid);
          res.redirect(`${req.locals.level === "org" ? "/org" : ""}/clients/${client}/messages`);
        }).catch(res.error500);
      
      // Otherwise create a new conversation
      } else {
        Conversations.create(req.user.cmid, client, subject, true)
        .then((conversationID) => {
          return Messages.sendOne(commID, content, conversationID)
        }).then(() => {
          req.logActivity.client(client);
          res.redirect(`${req.locals.level === "org" ? "/org" : ""}/clients/${client}/messages`);
        }).catch(res.error500);
      }
    }).catch(res.error500);
  },

  alter(req, res) {
    let userId = _getUser(req, res);
    let client = req.params.client;
    let status = req.params.status == "open";

    Client.alterCase(client, status)
    .then(() => {
      req.logActivity.client(client);
      req.flash("success", "Client case status changed.")
      res.redirect(`${req.locals.level === "org" ? "/org" : ""}/clients`);
    }).catch(res.error500);
  },

  transferSelect(req, res) {
    let allDep = req.query.allDepartments == "true" ? true : false;

    // Handle situations where an owner has a department attached to her/him
    if (req.user.class === "owner") { allDep = true; }

    Users.findByOrg(req.user.org)
    .then((users) => {
      // Limit only to same department transfers
      if (!allDep) users = users.filter((u) => { return u.department == req.user.department });

      res.render("clients/transfer", {
        users: users,
        allDepartments: allDep
      });
    }).catch(res.error500);
  },

  transferSubmit(req, res) {
    let fromUser = _getUser(req, res);
    let toUser = req.body.user;
    let client = res.locals.client.clid;
    let bundle = req.body.bundleConversations ? true : false;

    Users.findByID(toUser)
    .then((u) => {
      if (u && u.active) {
        Client.transfer(client, fromUser, u.cmid, bundle)
        .then(() => {
          req.logActivity.client(client);
          res.redirect(`${req.locals.level === "org" ? "/org" : ""}/clients`);
        }).catch(res.error500);

      } else {
        notFound(res);
      }
    }).catch(res.error500);
  },

  transcript(req, res) {
    let withUser = req.query.with || null;
    Messages.findByClientID(withUser, req.params.client)
    .then((messages) => {
      
      // Format into a text string
      messages = messages.map(function (m) {
        let s = "";
        Object.keys(m).forEach(function (k) { s += `\n${k}: ${m[k]}`; });
        return s;
      }).join("\n\n");

      // Note: this does not render a new page, just initiates a download
      res.set({"Content-Disposition":"attachment; filename=transcript.txt"});
      res.send(messages);
    }).catch(res.error500);
  }

};