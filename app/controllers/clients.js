const Clients = require('../models/clients');
const CommConns = require('../models/commConns');
const Conversations = require('../models/conversations');
const Messages = require('../models/messages');
const Templates = require('../models/templates');
const Users = require('../models/users');

const moment = require('moment');
const momentTz = require('moment-timezone');

const _average = (arr) => {
  let total = 0;
  for (let i = 0; i < arr.length; i++) {
    total += arr[i];
  }
  if (arr.length) {
    return total / arr.length;
  } else {
    return null;
  }
};

function _addNewMessageEvent (arr, date) {
  let added = false;
  date = moment(date).format('YYYY-MM-DD');
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].date == date) {
      arr[i].count += 1;
      added = true;
    }
  }
  if (!added) {
    arr.push({
      date: date,
      count: 1,
    });
  }
  return arr;
};

function _getDailyVolumes (messages) {
  const inbound = [];
  const outbound = [];

  messages.forEach((msg) => {
    const date = moment(msg.created).format('YYYY-MM-DD');
    let alreadyExists = false;
    const insert = {
      date: date,
      created: msg.created,
      count: 1,
    };

    if (msg.inbound) {
      inbound.forEach((m, i) => {
        if (m.date == date) {
          alreadyExists = true;
          inbound[i].count += 1;
        }
      });
      if (!alreadyExists) {
        inbound.push(insert);
      }
    } else {
      outbound.forEach((m, i) => {
        if (m.date == date) {
          alreadyExists = true;
          outbound[i].count += 1;
        }
      });
      if (!alreadyExists) {
        outbound.push(insert);
      }
    }
  });

  return {
    inbound: inbound,
    outbound: outbound,
  };
}

module.exports = {
  
  index(req, res) {
    const status      = req.query.status == 'closed' ? false : true;
    let department  = req.user.department || req.query.department;
    const user        = req.body.targetUser || req.user.cmid;
    const limitByUser = req.query.user || null;

    // Controls against a case where the owner would accidentally have a department
    if (  (req.user.class == 'owner' || req.user.class == 'support') && 
          !req.query.department) {
      department = null;
    }

    let method;
    if (res.locals.level == 'user') {
      method = Clients.findByUsers(user, status);
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

      res.render('clients/index', {
        hub: {
          tab: 'clients',
          sel: status ? 'open' : 'closed',
        },
        clients: clients,
        limitByUser: limitByUser || null,
      });
    }).catch(res.error500);
  },

  new(req, res) {
    const userClass = req.user.class;
    const level = res.locals.level;
    const org = req.user.org;
    if (level === 'user') {
      res.render('clients/create', { users: null, });
    } else {
      Users.findByOrg(org)
      .then((users) => {
        const department = req.user.department;
        if (department && userClass !== 'owner') {
          users = users.filter((user) => { return user.department == department; });
        }
        res.render('clients/create', { users: users, });
      }).catch(res.error500);
    }
  },

  create(req, res) {
    const userId = req.body.targetUser || req.user.cmid; // Will this work consistently?
    const first  = req.body.first;    
    const middle = req.body.middle ? req.body.middle : '';    
    const last   = req.body.last;   
    const dob    = req.body.dob;    
    const so     = req.body.uniqueID1 ? req.body.uniqueID1 : null;    
    const otn    = req.body.uniqueID2 ? req.body.uniqueID2 : null;

    Clients.create(
            userId, 
            first, 
            middle, 
            last, 
            dob, 
            so,  // note these should be renamed
            otn  // this one as well
    ).then((client) => {
      res.levelSensitiveRedirect('/clients');
    }).catch(res.error500);
  },

  edit(req, res) {
    res.render('clients/edit');
  },

  update(req, res) { 
    const client  = req.params.client;
    const first     = req.body.first;
    const middle    = req.body.middle;
    const last      = req.body.last;
    const dob       = req.body.dob;
    const so        = req.body.uniqueID1;
    const otn       = req.body.uniqueID2;
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
      req.flash('success', 'Edited client.');
      res.levelSensitiveRedirect('/clients');
    }).catch(res.error500);
  },

  addressCraft(req, res) {
    res.render('clients/address', {
      template: req.query,
    });
  },

  templates(req, res) {
    const user = req.getUser();

    Templates.findByUser(user)
    .then((templates) => {
      res.render('clients/templates', {
        templates: templates,
        parameters: req.query,
      });
    }).catch(res.error500);
  },

  addressSubmit(req, res) {
    const user = req.getUser();

    const client = req.params.client;
    const subject  = req.body.subject;
    const content  = req.body.content;
    const commID   = req.body.commID == 'null' ? null : req.body.commID;
    let method;

    if (commID) {
      method = Messages.startNewConversation(user, client, subject, content, commID);
    } else {
      method = Messages.smartSend(user, client, subject, content);
    }

    method.then(() => {
      req.logActivity.client(client);
      req.flash('success', 'Message to client sent.');
      res.levelSensitiveRedirect('/clients');
    }).catch(res.error500);
  },

  mediaAttachment(req, res) {
    req.flash('warning', 'Media attachments are not yet supported.');
    res.levelSensitiveRedirect(`/clients/${req.params.client}/messages`);
  },

  messagesIndex(req, res) {
    let clientId = req.params.client;
    let method = req.query.method;
    let user = req.getUser();

    // determine if we should filter by type
    let methodFilter = 'all';
    if (req.query.method == 'texts') methodFilter = 'cell';

    let convoFilter = Number(req.query.conversation);
    if (isNaN(convoFilter)) convoFilter = null;

    let client, conversations, messages;
    Clients.findById(clientId)
    .then((resp) => {
      client = resp;
      return Conversations.findByUserAndClient(user, clientId)
    }).then((resp) => {
      conversations = resp;

      const conversationIds = conversations.filter((conversation) => {
        return conversation.client == Number(client);
      }).map((conversation) => {
        return conversation.convid;
      });

      return Messages.findWithSentimentAnalysisAndCommConnMetaByConversationIds(conversationIds);
    }).then((resp) => {

      messages = resp.filter((msg) => {
        if (msg.comm_type == methodFilter || methodFilter == 'all') {
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
      });

      // control to keep other people from "marking as read" someones messages
      if (req.user.cmid !== client.cm) {
        messageIds = [];
      }
      return Messages.markAsRead(messageIds);
    }).then(() => {

      return CommConns.findByClientIdWithCommMetaData(clientId);
    }).then((communications) => {

      let unclaimed = conversations.filter((conversation) => {
        return !conversation.accepted;
      });

      // if there are unclaimed messages that need to be viewed and this the client's main cm
      if (unclaimed.length && req.user.cmid == client.cm) {
        unclaimed = unclaimed[0];
        res.redirect(`/clients/${client}/conversations/${unclaimed.convid}/claim`);
      } else {
        res.render('clients/messages', {
          hub: {
            tab: 'messages',
            sel: method ? method : 'all',
          },
          conversations: conversations,
          messages: messages,
          communications: communications,
          convoFilter: convoFilter,
        });
      }
    }).catch(res.error500);
  },

  messagesSubmit(req, res) {
    const user = req.getUser();
    const client = req.params.client;
    const subject  = 'New Conversation';
    const content  = req.body.content;
    const commID   = req.body.commID;
    let conversation;

    Conversations.getMostRecentConversation(user, client)
    .then((resp) => {
      conversation = resp;
      const conversationId = conversation.convid;
      return Conversations.closeAllWithClientExcept(client, conversationId);
    }).then(() => {
      // Use existing conversation if exists and recent (lt 5 days)
      let now, lastUpdated, recentOkay = false;
      if (conversation) {
        now = new Date().getTime() - (5 * 24 * 60 * 60 * 1000); // 5 days in past
        lastUpdated = new Date(conversation.updated).getTime();
        recentOkay = lastUpdated > now;
      }

      if (conversation && recentOkay) {
        Messages.sendOne(commID, content, conversation)
        .then(() => {
          req.logActivity.client(client);
          req.logActivity.conversation(conversation.convid);
          res.levelSensitiveRedirect(`/clients/${client}/messages`);
        }).catch(res.error500);
      
      // Otherwise create a new conversation
      } else {
        Conversations.create(user, client, subject, true)
        .then((conversation) => {
          return Messages.sendOne(commID, content, conversation);
        }).then(() => {
          req.logActivity.client(client);
          res.levelSensitiveRedirect(`/clients/${client}/messages`);
        }).catch(res.error500);
      }
    }).catch(res.error500);
  },

  alter(req, res) {
    const userId = req.getUser();
    const clientId = req.params.client;
    const status = req.params.status == 'open';

    Conversations.closeAllWithClient(userId, clientId)
    .then(() => {
      return Clients.alterCase(clientId, status);
    }).then(() => {
      req.logActivity.client(clientId);
      req.flash('success', 'Client case status changed.');
      res.levelSensitiveRedirect('/clients');
    }).catch(res.error500);
  },

  transferSelect(req, res) {
    let allDep = req.query.allDepartments == 'true' ? true : false;

    // Handle situations where an owner has a department attached to her/him
    if (req.user.class === 'owner') { allDep = true; }
    if (req.user.class === 'support') { allDep = true; }

    Users.findByOrg(req.user.org)
    .then((users) => {
      // Limit only to same department transfers
      if (!allDep) users = users.filter((u) => { return u.department == req.user.department; });

      res.render('clients/transfer', {
        users: users,
        allDepartments: allDep,
      });
    }).catch(res.error500);
  },

  transferSubmit(req, res) {
    const fromUser = req.getUser();
    const toUser = req.body.user;
    const client = res.locals.client.clid;
    const bundle = req.body.bundleConversations ? true : false;

    Users.findByID(toUser)
    .then((u) => {
      if (u && u.active) {
        Clients.transfer(client, fromUser, u.cmid, bundle)
        .then(() => {
          req.logActivity.client(client);
          res.levelSensitiveRedirect('/clients');
        }).catch(res.error500);

      } else {
        notFound(res);
      }
    }).catch(res.error500);
  },

  transcript(req, res) {
    const withUser = req.query.with || null;
    Messages.findBetweenUserAndClient(withUser, req.params.client)
    .then((messages) => {
      
      // Format into a text string
      messages = messages.map(function (m) {
        let s = '';
        Object.keys(m).forEach(function (k) { s += `\n${k}: ${m[k]}`; });
        return s;
      }).join('\n\n');

      // Note: this does not render a new page, just initiates a download
      res.set({'Content-Disposition':'attachment; filename=transcript.txt',});
      res.send(messages);
    }).catch(res.error500);
  },

  clientCard(req, res) {
    const client = req.params.client;
    const user = req.getUser();

    let messages, otherPotentialManagers, lastCommuncationUsed;

    Clients.findBySameName(res.locals.client)
    .then((clients) => {
      const userIds = clients.map((client) => {
        return client.cm;
      });
      return Users.findByIds(userIds);
    }).then((users) => {
      otherPotentialManagers = users;
      return Messages.findBetweenUserAndClient(user, client);
    }).then((msgs) => {
      messages = msgs;
      return CommConns.findByClientIdWithCommMetaData(client);
    }).then((communications) => {

      let unreadCount = 0,

          // getting the last messages
        lastOutbound = {}, 
        lastInbound = {},

          // for measuring avg response times
        lastClientMsg = null,
        clientResponseList = [];
      lastUserMsg = null,
          userResponseList = [],
          sentiment = {
            negative: 0,
            neutral: 0,
            positive: 0,
          },

          // counting by day
          countsOutbound = [],
          countsInbound = [];

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
              const a = new Date(msg.created);
              const b = new Date(lastUserMsg.created);
              clientResponseList.push(a - b);
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
              const a = new Date(msg.created);
              const b = new Date(lastClientMsg.created);
              userResponseList.push(a - b);
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

      const averageClientResponseTime = _average(clientResponseList);
      const averageUserResponseTime = _average(userResponseList);

      const totalSentimentCount = sentiment.negative + sentiment.neutral + sentiment.positive;
      sentiment.negative = Math.round((sentiment.negative / totalSentimentCount) * 100) || 0;
      sentiment.neutral = Math.round((sentiment.neutral / totalSentimentCount) * 100) || 0;
      sentiment.positive = Math.round((sentiment.positive / totalSentimentCount) * 100) || 0;

      const inboundCount = messages.filter((msg) => { return msg.inbound; }).length;
      const outboundCount = messages.length - inboundCount;

      //Find last used contact
      if (messages.length) {
        const lastMessage = messages[messages.length -1];
        const lastMessageComm = lastMessage.comm;
        communications.forEach((comm) => {
          if (comm.commid == lastMessageComm) {
            lastCommuncationUsed = comm;
          }
        });
      }

      // Get counts
      const dailyCounts = _getDailyVolumes(messages);

      res.render('clients/profile', {
        hub: {
          tab: 'profile',
          sel: null,
        },
        messages: {
          all: messages,
          dailyCounts: dailyCounts,
          unreadCount: unreadCount,
          inboundCount: inboundCount,
          outboundCount: outboundCount,
          sentiment: sentiment,
          averageClientResponseTime: averageClientResponseTime || 0,
          averageUserResponseTime: averageUserResponseTime || 0,
          lastInbound: lastInbound,
          lastOutbound: lastOutbound,
        },
        communications: communications,
        lastCommuncationUsed: lastCommuncationUsed,
        otherPotentialManagers: otherPotentialManagers,
      });
    }).catch(res.error500);
  },

};