const Clients = require('../models/clients');
const CommConns = require('../models/commConns');
const Conversations = require('../models/conversations');
const Messages = require('../models/messages');
const Users = require('../models/users');

let moment = require("moment");
let moment_tz = require("moment-timezone");

const _average = (arr) => {
  let total = 0;
  for (var i = 0; i < arr.length; i++) {
    total += arr[i];
  }
  if (arr.length) {
    return total / arr.length;
  } else {
    return null
  }
}

module.exports = {
  
  index(req, res) {
    let status      = req.query.status == "closed" ? false : true;
    let department  = req.user.department || req.query.department;
    let user        = req.body.targetUser || req.user.cmid;
    let limitByUser = req.query.user || null;

    // Controls against a case where the owner would accidentally have a department
    if (  (req.user.class == "owner" || req.user.class == "support") && 
          !req.query.department) {
      department = null;
    }

    let method;
    if (res.locals.level == "user") {
      method = Clients.findByUsers(user, status)
    } else if (department) {
      method = Clients.findByDepartment(department, status);
    } else {
      method = Clients.findByOrg(req.user.org, status);
    }

    method.then((clients) => {
      if (limitByUser) {
        clients = clients.filter((client) => {
          return Number(client.cm) === Number(limitByUser);
        });
      }

      res.render("clients/index", {
        hub: {
          tab: "clients",
          sel: status ? "open" : "closed"
        },
        clients: clients,
        limitByUser: limitByUser || null
      });
    }).catch(res.error500);
  },

  new(req, res) {
    let userClass = req.user.class;
    let level = res.locals.level;
    let org = req.user.org;
    if (level === "user") {
      res.render("clients/create", { users: null });
    } else {
      Users.findByOrg(org)
      .then((users) => {
        let department = req.user.department;
        if (department && userClass !== "owner") {
          users = users.filter((user) => { return user.department == department; });
        }
        res.render("clients/create", { users: users });
      }).catch(res.error500);
    }
  },

  create(req, res) {
    let userId = req.body.targetUser || req.user.cmid; // Will this work consistently?
    let first  = req.body.first;    
    let middle = req.body.middle ? req.body.middle : "";    
    let last   = req.body.last;   
    let dob    = req.body.dob;    
    let so     = req.body.uniqueID1 ? req.body.uniqueID1 : null;    
    let otn    = req.body.uniqueID2 ? req.body.uniqueID2 : null;

    Clients.create(
            userId, 
            first, 
            middle, 
            last, 
            dob, 
            so,  // note these should be renamed
            otn  // this one as well
    ).then((client) => {
      res.levelSensitiveRedirect(`/clients`);
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
    Clients.editOne(
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
      res.levelSensitiveRedirect(`/clients`);
    }).catch(res.error500);
  },

  addressCraft(req, res) {
    res.render("clients/address", {
      template: req.query
    });
  },

  addressSubmit(req, res) {
    let user = req.getUser();

    let client = req.params.client;
    let subject  = req.body.subject;
    let content  = req.body.content;
    let commID   = req.body.commID == "null" ? null : req.body.commID;
    let method;

    if (commID) {
      method = Messages.startNewConversation(user, client, subject, content, commID);
    } else {
      method = Messages.smartSend(user, client, subject, content);
    }

    method.then(() => {
      req.logActivity.client(client);
      req.flash("success", "Message to client sent.");
      res.levelSensitiveRedirect(`/clients`);
    }).catch(res.error500);
  },

  messagesIndex(req, res) {
    let client = req.params.client;
    let method = req.query.method;
    let user = req.getUser();

    // determine if we should filter by type
    let methodFilter = "all";
    if (req.query.method == "texts") methodFilter = "cell";

    let convoFilter = Number(req.query.conversation);
    if (isNaN(convoFilter)) convoFilter = null;

    let conversations, messages;
    Conversations.findByUserAndClient(user, client)
    .then((convos) => {
      conversations = convos;
      return Messages.findByClientID(user, client)
    }).then((msgs) => {
      messages = msgs.filter((msg) => {
        if (msg.comm_type == methodFilter || methodFilter == "all") {
          return msg.convo == convoFilter || convoFilter == null;
        } else { 
          return false; 
        }
      });
      
      // determine if any messages need to be marked as read
      let messageIds = messages.filter((msg) => {
        return msg.read === false;
      }).map((msg) => {
        return msg.msgid;
      })
      return Messages.markAsRead(messageIds)
    }).then(() => {
      
      return CommConns.findByClientID(client)
    }).then((communications) => {
      res.render("clients/messages", {
        hub: {
          tab: "messages",
          sel: method ? method : "all"
        },
        conversations: conversations,
        messages: messages,
        communications: communications,
        convoFilter: convoFilter
      });
    }).catch(res.error500);
  },

  messagesSubmit(req, res) {
    let user = req.getUser();
    let client = req.params.client;
    let subject  = "New Conversation";
    let content  = req.body.content;
    let commID   = req.body.commID;

    Conversations.getMostRecentConversation(user, client)
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
          res.levelSensitiveRedirect(`/clients/${client}/messages`);
        }).catch(res.error500);
      
      // Otherwise create a new conversation
      } else {
        Conversations.create(user, client, subject, true)
        .then((conversation) => {
          return Messages.sendOne(commID, content, conversation.convid)
        }).then(() => {
          req.logActivity.client(client);
          res.levelSensitiveRedirect(`/clients/${client}/messages`);
        }).catch(res.error500);
      }
    }).catch(res.error500);
  },

  alter(req, res) {
    let userId = req.getUser();
    let client = req.params.client;
    let status = req.params.status == "open";

    Clients.alterCase(client, status)
    .then(() => {
      req.logActivity.client(client);
      req.flash("success", "Client case status changed.")
      res.levelSensitiveRedirect(`/clients`);
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
    let fromUser = req.getUser();
    let toUser = req.body.user;
    let client = res.locals.client.clid;
    let bundle = req.body.bundleConversations ? true : false;

    Users.findByID(toUser)
    .then((u) => {
      if (u && u.active) {
        Clients.transfer(client, fromUser, u.cmid, bundle)
        .then(() => {
          req.logActivity.client(client);
          res.levelSensitiveRedirect(`/clients`);
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
  },

  clientCard(req, res) {
    let client = req.params.client;
    let user = req.getUser();

    let messages;

    Messages.findByClientID(user, client)
    .then((msgs) => {
      messages = msgs;
      return CommConns.findByClientID(client)
    }).then((communications) => {

      let unreadCount = 0,

          // getting the last messages
          lastOutbound = {}, 
          lastInbound = {},

          // for measuring avg response times
          lastClientMsg = null,
          clientResponseList = []
          lastUserMsg = null,
          userResponseList = [],
          sentiment = {
            negative: 0,
            neutral: 0,
            positive: 0
          },

          // counting by day
          countsOutbound = [],
          countsInbound = [];

      function _addNewMessageEvent (arr, date) {
        let added = false;
        date = moment(date).format("YYYY-MM-DD");
        for (var i = 0; i < arr.length; i++) {
          if (arr[i].date == date) {
            arr[i].count += 1;
            added = true;
          }
        }
        if (!added) {
          arr.push({
            date: date,
            count: 1
          });
        }
        return arr;
      }

      messages.forEach((msg, i) => {
        if (!msg.read) {
          unreadCount += 1;
        }

        if (msg.inbound) {
          lastInbound = msg;
          countsInbound = _addNewMessageEvent(countsInbound, msg.created);
        } else {
          lastOutbound = msg;
          countsOutbound = _addNewMessageEvent(countsOutbound, msg.created);
        }

        if (msg.sentiment) {
          try {
            sentiment[msg.sentiment] += 1;
          } catch (e) {}
        }

        if (msg.inbound) {
          if (lastUserMsg) {
            if (lastUserMsg.convo == msg.convo) {
              let a = new Date(msg.created)
              let b = new Date(lastUserMsg.created)
              clientResponseList.push(a - b)
              lastUserMsg = null;
              lastClientMsg = msg;
            } else {
              lastUserMsg = null;
            }
          } else {
            if (!lastClientMsg) {
              lastClientMsg = msg;
            }
          }
        } else {
          if (lastClientMsg) {
            if (lastClientMsg.convo == msg.convo) {
              let a = new Date(msg.created)
              let b = new Date(lastClientMsg.created)
              userResponseList.push(a - b)
              lastClientMsg = null;
              lastUserMsg = msg;
            } else {
              lastClientMsg = null;
            }
          } else {
            if (!lastUserMsg) {
              lastUserMsg = msg;
            }
          }
        }
      });

      let averageClientResponseTime = _average(clientResponseList);
      let averageUserResponseTime = _average(userResponseList);

      let totalSentimentCount = sentiment.negative + sentiment.neutral + sentiment.positive;
      sentiment.negative = Math.round((sentiment.negative / totalSentimentCount) * 100) || 0;
      sentiment.neutral = Math.round((sentiment.neutral / totalSentimentCount) * 100) || 0;
      sentiment.positive = Math.round((sentiment.positive / totalSentimentCount) * 100) || 0;

      let inboundCount = messages.filter((msg) => { return msg.inbound; }).length;
      let outboundCount = messages.length - inboundCount;

      res.render("clients/profile", {
        hub: {
          tab: null,
          sel: null
        },
        messages: {
          all: messages,
          unreadCount: unreadCount,
          inboundCount: inboundCount,
          outboundCount: outboundCount,
          sentiment: sentiment,
          averageClientResponseTime: averageClientResponseTime,
          averageUserResponseTime: averageUserResponseTime,
          lastInbound: lastInbound,
          lastOutbound: lastOutbound
        },
        communications: communications
      });
    }).catch(res.error500);
  }

};