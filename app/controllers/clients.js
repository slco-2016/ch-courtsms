const Clients = require('../models/clients');
const CloseoutSurveys = require('../models/closeoutSurveys');
const CommConns = require('../models/commConns');
const Conversations = require('../models/conversations');
const Messages = require('../models/messages');
const Organizations = require('../models/organizations');
const Templates = require('../models/templates');
const Users = require('../models/users');

// assistance libraries
const libUser = require('../lib/users');
const analyticsService = require('../lib/analytics-service');

const moment = require('moment');
const momentTz = require('moment-timezone');

const _average = (arr) => {
  let total = 0;
  for (let i = 0; i < arr.length; i++) {
    total += arr[i];
  }
  if (arr.length) {
    return total / arr.length;
  }
  return null;
};

function _getDailyVolumes(messages) {
  const inbound = [];
  const outbound = [];

  messages.forEach((msg) => {
    const date = moment(msg.created).format('YYYY-MM-DD');
    let alreadyExists = false;
    const insert = {
      date,
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
    inbound,
    outbound,
  };
}

module.exports = {

  index(req, res) {
    const showActiveClients = req.query.status !== 'archived';
    let departmentID = req.user.department || req.query.department;
    const user = req.body.targetUser || req.user.cmid;
    const limitByUser = req.query.user || null;

    // Don't limit by department if the user's support or an owner
    if ((req.user.class == 'owner' || req.user.class == 'support') &&
          !req.query.department) {
      departmentID = null;
    }

    let method;
    if (res.locals.level == 'user') {
      method = Clients.findByUsers(user, showActiveClients);
    } else if (departmentID) {
      method = Clients.findManyByDepartmentAndStatus(departmentID, showActiveClients);
    } else {
      method = Clients.findByOrg(req.user.org, showActiveClients);
    }

    method.then((clients) => {
      if (limitByUser) {
        clients = clients.filter(client => Number(client.cm) === Number(limitByUser));
      }

      Users.findAllByClientIds(clients.map(c => c.clid)).then((users) => {
        const usersByCmid = users.reduce((a, user) => {
          /* eslint-disable no-param-reassign */
          a[user.cmid] = user;
          /* eslint-enable no-param-reassign */
          return a;
        }, {});

        analyticsService.track(null, 'client_list_view', req, res.locals, {
          cccs_active: showActiveClients,
          cccs_count: clients.length,
        });

        res.render('clients/index', {
          hub: {
            tab: 'clients',
            sel: showActiveClients ? 'current' : 'archived',
          },
          clients,
          usersByCmid,
          limitByUser: limitByUser || null,
        });
      }).catch(res.error500);
    }).catch(res.error500);
  },

  new(req, res) {
    analyticsService.track(null, 'client_create_start', req, res.locals);
    const userClass = req.user.class;
    const level = res.locals.level;
    const org = req.user.org;
    // don't render the 'Attach to case manager' field if this is a case manager
    if (level === 'user') {
      res.render('clients/create', { users: null });
    } else {
      Users.where({ org, active: true })
      .then((users) => {
        // if we want to filter by department, we could do it here
        res.render('clients/create', { users });
      }).catch(res.error500);
    }
  },

  create(req, res) {
    // Create a client

    // default date of birth
    const dob_default = '1900-01-01';

    const userId = req.body.targetUser || req.user.cmid; // Will this work consistently?
    const first = req.body.first;
    const middle = req.body.middle ? req.body.middle : '';
    const last = req.body.last;
    const dob = req.body.dob || dob_default;
    const so = req.body.uniqueID1 ? req.body.uniqueID1 : null;
    const otn = req.body.uniqueID2 ? req.body.uniqueID2 : null;

    Clients.create(userId, first, middle, last, dob, otn, so)
      .then(client => {
        analyticsService.track(null, 'client_create_success', req, res.locals, {
          ccc_id: client.clid,
          ccc_dob: Boolean(dob) && dob != dob_default,
          ccc_so: Boolean(so),
          ccc_otn: Boolean(otn),
        });
        if (req.user.cmid == client.cm) {
          res.redirect(`/clients/${client.clid}/messages`);
        } else {
          res.levelSensitiveRedirect('/clients');
        }
      })
      .catch(res.error500);
  },

  edit(req, res) {
    res.render('clients/edit');
  },

  update(req, res) {
    const clientId = req.params.client;
    const first = req.body.first;
    const middle = req.body.middle;
    const last = req.body.last;
    const dob = req.body.dob;
    const so = req.body.uniqueID1;
    const otn = req.body.uniqueID2;
    const autoNotify = !!req.body.autoNotify;
    Clients.editOne(
            clientId,
            first,
            middle,
            last,
            dob,
            so,
            otn,
            autoNotify
    ).then(() => {
      analyticsService.track(null, 'client_edit_success', req, res.locals, {
        ccc_id: clientId,
      });
      req.logActivity.client(clientId);
      req.flash('success', 'Edited client.');
      res.levelSensitiveRedirect('/clients');
    }).catch(res.error500);
  },

  addressCraft(req, res) {
    const clientId = req.params.client;
    analyticsService.track(null, 'message_create_view', req, res.locals, {
      ccc_id: clientId,
      ccc_active: res.locals.client.active,
      template_use: (req.query.templateid) ? true : false,
    });

    res.render('clients/address', {
      template: req.query,
    });
  },

  templates(req, res) {
    const user = req.getUser();

    Templates.findByUser(user)
    .then((templates) => {
      res.render('clients/templates', {
        templates,
        parameters: req.query,
      });
    }).catch(res.error500);
  },

  addressSubmit(req, res) {
    const user = req.getUser();

    const client = req.params.client;
    const subject = req.body.subject;
    const content = req.body.content;
    const commID = req.body.commID == 'null' ? null : req.body.commID;
    let method;

    if (commID) {
      method = Messages.startNewConversation(user, client, subject, content, commID);
    } else {
      method = Messages.smartSend(user, client, subject, content);
    }

    method.then(() => {
      // log the use of a template if it exists
      const templateId = req.body.templateid;
      if (templateId) {
        Templates.logUse(templateId, user, client).then().catch();
      }

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
    const clientId = req.params.client;
    const method = req.query.method;
    const user = req.getUser();

    // determine if we should filter by type
    let methodFilter = 'all';
    if (req.query.method == 'texts') methodFilter = 'cell';
    if (req.query.method == 'emails') methodFilter = 'email';

    let convoFilter = Number(req.query.conversation);
    if (isNaN(convoFilter)) convoFilter = null;

    let client, conversations, messages, hasUnreadMessages;

    Clients.findById(clientId)
    .then((resp) => {
      client = resp;
      return Conversations.findByUserAndClient(user, clientId);
    }).then((resp) => {
      conversations = resp;

      const conversationIds = conversations.filter(conversation => conversation.client == client.clid).map(conversation => conversation.convid);

      return Messages.findWithSentimentAnalysisAndCommConnMetaByConversationIds(conversationIds);
    }).then((resp) => {
      messages = resp.filter((msg) => {
        if (msg.comm_type == methodFilter || methodFilter == 'all') {
          return msg.convo == convoFilter || convoFilter === null;
        }
        return false;
      });

      // determine if any messages need to be marked as read
      let unreadIds = messages.filter(msg => msg.read === false).map(msg => msg.msgid);
      // control to keep other people from "marking as read" someones messages
      hasUnreadMessages = (unreadIds.length > 0 && req.user.cmid == client.cm);
      if (!hasUnreadMessages) {
        unreadIds = [];
      }
      return Messages.markAsRead(unreadIds);

    }).then(() => CommConns.findByClientIdWithCommMetaData(clientId)).then((communications) => {
      let unclaimed = conversations.filter(conversation => !conversation.accepted && conversation.open);

      // prompt to create a comm method if none exists
      if (communications.length === 0) {
        res.redirect(`/clients/${client.clid}/communications/create`);

      // if there are unclaimed messages that need to be viewed and this the client's main cm
      } else if (unclaimed.length && req.user.cmid == client.cm) {
        unclaimed = unclaimed[0];
        res.redirect(`/clients/${client.clid}/conversations/${unclaimed.convid}/claim`);
      } else {
        // how many hours ago was the last contact?
        let sinceLast = null;
        if (messages.length) {
          now = moment().utc();
          sinceLast = now.diff(
            moment(messages[messages.length - 1].created).utc(),
            'hours'
          );
        }
        // how many messages sent and received?
        let allMessagesCount = messages.length;
        let messagesSent = messages.filter(msg => msg.inbound === false);
        let sentMessagesCount = messagesSent.length;
        // how many cell and email messages sent?
        let cellMessagesSentCount = messagesSent.filter(
          msg => msg.comm_type == 'cell'
        ).length;
        let emailMessagesSentCount = messagesSent.filter(
          msg => msg.comm_type == 'email'
        ).length;

        analyticsService.track(null, 'client_messages_view', req, res.locals, {
          ccc_id: clientId,
          ccc_active: client.active,
          unread_messages: hasUnreadMessages,
          hours_since_message: sinceLast,
          messages_all_count: allMessagesCount,
          messages_received_count: allMessagesCount - sentMessagesCount,
          messages_sent_count: sentMessagesCount,
          texts_sent_count: cellMessagesSentCount,
          emails_sent_count: emailMessagesSentCount
        });

        res.render('clients/messages', {
          hub: {
            tab: 'messages',
            sel: method || 'all',
          },
          conversations,
          messages,
          communications,
          convoFilter,
        });
      }
    }).catch(res.error500);
  },

  messagesSubmit(req, res) {
    const user = req.getUser();
    const client = req.params.client;
    const subject = 'New Conversation';
    const content = req.body.content;
    const commID = req.body.commID;
    let conversation;

    Conversations.getMostRecentConversation(user, client)
    .then((resp) => {
      conversation = resp;
      if (conversation) {
        const conversationId = conversation.convid;
        return Conversations.closeAllWithClientExcept(client, conversationId);
      }
      return new Promise((fulfill, reject) => {
        fulfill();
      });
    }).then(() => {
      // Use existing conversation if exists and recent (lt 5 days)
      let now,
        lastUpdated,
        recentOkay = false;
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
        .then(conversation => Messages.sendOne(commID, content, conversation)).then(() => {
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
    .then(() => Clients.alterCase(clientId, status)).then(() => {
      req.logActivity.client(clientId);

      let track_label;
      let redirect_location;
      if (!status) {
        req.flash('success', 'Client archived.');
        track_label = 'client_archive';
        redirect_location = `/clients/${clientId}/closeoutsurvey`;
      } else {
        req.flash('success', 'Client restored.');
        track_label = 'client_unarchive';
        redirect_location = '/clients';
      }

      analyticsService.track(null, track_label, req, res.locals, {
        ccc_id: clientId,
      });

      res.levelSensitiveRedirect(redirect_location);
    }).catch(res.error500);
  },

  transferSelect(req, res) {
    let allDep = req.query.allDepartments == 'true';

    // Handle situations where an owner has a department attached to her/him
    if (['owner', 'supervisor', 'support', ].indexOf(req.user.class) > -1) {
      allDep = true;
    }

    const usersThatArePresentlyActive = true;
    libUser.findByOrgWithDepartmentNameAndNoInfoTag(req.user.org, usersThatArePresentlyActive)
    .then((users) => {
      // Limit only to same department transfers
      if (!allDep) {
        users = users.filter(ea => ea.department == req.user.department);
      }

      res.render('clients/transfer', {
        users,
        allDepartments: allDep,
      });
    }).catch(res.error500);
  },

  transferSubmit(req, res) {
    const fromUser = req.getUser();
    const toUser = req.body.user;
    const client = res.locals.client.clid;
    const bundle = !!req.body.bundleConversations;

    // globals
    let user;
    let org;

    Organizations.findById(req.user.org)
    .then((resp) => {
      org = resp;

      return Users.findById(toUser);
    }).then((resp) => {
      user = resp;
      if (user && user.active) {
        Clients.transfer(client, fromUser, user.cmid, bundle)
        .then(() => {
          // now that the client has been successfully transfered, let's send them a
          // courtesy email to let them know that their contact at that # has changed
          const client = req.params.client;
          const subject = 'Automated notification: You have been transferred.';
          const content = `Your account for communications with ${org.name} has been transferred to the following individual: ${user.first} ${user.last}. You can start messaging now with ${user.first} ${user.last} if you have any questions.`;
          const commID = req.body.commID == 'null' ? null : req.body.commID;

          return Messages.smartSend(toUser, client, subject, content);
        }).then(() => {
          req.logActivity.client(client);
          res.levelSensitiveRedirect('/clients');
        }).catch(res.error500);
      } else {
        notFound(res);
      }
    }).catch(res.error500);
  },

  transcript(req, res) {
    let user,
      client,
      messages,
      viewAll = false;

    Clients.findById(req.params.client)
    .then((resp) => {
      client = resp;

      return Users.findById(client.cm);
    }).then((resp) => {
      user = resp;

      // check if user has right to just view their conversations with client or all
      // TODO: revisit the permissions logic here
      if (user.class !== 'primary') {
        viewAll = false;
      }

      if (viewAll) {
        return Messages.findTranscriptAllFromClient(user.cmid, req.params.client);
      }
      return Messages.findTranscriptBetweenUserAndClient(user.cmid, req.params.client);
    }).then((resp) => {
      messages = resp;

      // get org time zone
      return Organizations.findById(req.user.org);
    }).then((organization) => {
      // update to org local timezone
      messages = messages.map((message) => {
        const tz = organization.tz || 'America/Denver';
        message.local_date_time = moment(message.date_time).tz(tz).format('MMMM Do YYYY, h:mm:ss a');
        message.local_timezone_used = tz;
        return message;
      });

      // Format into a text string
      messages = messages.map((message) => {
        let stringVersionOfMessageObject = '';
        Object.keys(message).forEach((key) => {
          stringVersionOfMessageObject += `\n${key}: ${message[key]}`;
        });
        return stringVersionOfMessageObject;
      }).join('\n');

      let firstPart = '';
      if (viewAll) {
        firstPart = `Viewing all messages to/from client ${client.first} ${client.middle} ${client.last}`;
      } else {
        firstPart = `Viewing messages between client ${client.first} ${client.middle} ${client.last} and ${user.first} ${user.middle} ${user.last}`;
      }
      firstPart = `${firstPart} \nRetrieved at: ${moment().format('YYYY-MM-DD HH:mm:ss')} GMT \n--------------------------\n`;
      messages = firstPart + messages;

      // convert from plain text to rtf
      // source: http://stackoverflow.com/questions/29922771/convert-rtf-to-and-from-plain-text
      function convertToRtf(plain) {
        plain = plain.replace(/\n/g, '\\par\n');
        return `{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang2057{\\fonttbl{\\f0\\fnil\\fcharset0 Microsoft Sans Serif;}}\n\\viewkind4\\uc1\\pard\\f0\\fs17 ${plain}\\par\n}`;
      }
      messages = convertToRtf(messages);

      // Note: this does not render a new page, just initiates a download
      res.set({ 'Content-Disposition': 'attachment; filename=transcript.rtf' });
      res.send(messages);
    }).catch(res.error500);
  },

  viewCloseoutSurvey(req, res) {
    const clientId = req.params.client;

    Clients.findById(clientId)
    .then((client) => {
      analyticsService.track(null, 'client_survey_view', req, res.locals, {
        ccc_id: clientId,
      });
      res.render('clients/closeoutSurvey', {
        client,
      });
    }).catch(res.error500);
  },

  submitCloseoutSurvey(req, res) {
    const clientId = req.params.client;
    const closeOutStatus = req.body.closeOutStatus;
    const mostCommonMethod = req.body.mostCommonMethod;
    var likelihoodSuccessWithoutCC = req.body.likelihoodSuccessWithoutCC;
    const helpfulnessCC = req.body.helpfulnessCC;
    const mostOftenDiscussed = req.body.mostOftenDiscussed;

    // clean some of the inputs
    if (isNaN(likelihoodSuccessWithoutCC)) likelihoodSuccessWithoutCC = null;
    CloseoutSurveys.create(clientId, closeOutStatus,
                            mostCommonMethod, likelihoodSuccessWithoutCC,
                            helpfulnessCC, mostOftenDiscussed)
    .then(() => {
      analyticsService.track(null, 'client_survey_complete', req, res.locals, {
        ccc_id: clientId,
        closeout_status: closeOutStatus,
        success_likelihood: likelihoodSuccessWithoutCC,
        clientcomm_helpfulness: helpfulnessCC,
      });      
      req.flash('success', 'Thank you for submitting the survey.');
      res.levelSensitiveRedirect('/clients');
    }).catch(res.error500);
  },

  clientCard(req, res) {
    const clientId = req.params.client;
    const user = req.getUser();

    let messages,
      otherPotentialManagers,
      lastCommuncationUsed;

    Clients.findBySameName(res.locals.client)
    .then((clients) => {
      const userIds = clients.map(client => client.cm);
      return Users.findByIds(userIds);
    }).then((users) => {
      otherPotentialManagers = users;
      return Messages.findBetweenUserAndClient(user, clientId);
    }).then((resp) => {
      messages = resp;
      return CommConns.findByClientIdWithCommMetaData(clientId);
    }).then((communications) => {
      let unreadCount = 0,
        // getting the last messages
        lastOutbound = null,
        lastInbound = null,
        // for measuring avg response times
        lastClientMsg = null,
        clientResponseTimes = [],
        lastUserMsg = null,
        userResponseTimes = [],
        sentiment = {
          negative: 0,
          neutral: 0,
          positive: 0,
        };

      messages.forEach((msg, i) => {
        if (!msg.read) {
          unreadCount += 1;
        }

        if (msg.inbound) {
          lastInbound = msg;
        } else {
          lastOutbound = msg;
        }

        if (msg.sentiment) {
          try {
            sentiment[msg.sentiment] += 1;
          } catch (e) {}
        }

        // calculate average response times
        if (msg.inbound) {
          if (lastUserMsg) {
            if (lastUserMsg.convo == msg.convo) {
              const a = new Date(msg.created);
              const b = new Date(lastUserMsg.created);
              clientResponseTimes.push(a - b);
              lastUserMsg = null;
              lastClientMsg = msg;
            } else {
              lastUserMsg = null;
            }
          } else if (!lastClientMsg) {
            lastClientMsg = msg;
          }
        } else if (lastClientMsg) {
          if (lastClientMsg.convo == msg.convo) {
            const a = new Date(msg.created);
            const b = new Date(lastClientMsg.created);
            userResponseTimes.push(a - b);
            lastClientMsg = null;
            lastUserMsg = msg;
          } else {
            lastClientMsg = null;
          }
        } else if (!lastUserMsg) {
          lastUserMsg = msg;
        }
      });

      const averageClientResponseTime = _average(clientResponseTimes);
      const averageUserResponseTime = _average(userResponseTimes);

      const totalSentimentCount = sentiment.negative + sentiment.neutral + sentiment.positive;
      sentiment.negative = Math.round((sentiment.negative / totalSentimentCount) * 100) || 0;
      sentiment.neutral = Math.round((sentiment.neutral / totalSentimentCount) * 100) || 0;
      sentiment.positive = Math.round((sentiment.positive / totalSentimentCount) * 100) || 0;

      const inboundCount = messages.filter(msg => msg.inbound).length;
      const outboundCount = messages.length - inboundCount;

      // Find last used contact
      if (messages.length) {
        const lastMessage = messages[messages.length - 1];
        const lastMessageComm = lastMessage.comm;
        communications.forEach((comm) => {
          if (comm.commid == lastMessageComm) {
            lastCommuncationUsed = comm;
          }
        });
      }

      // Get counts
      const dailyCounts = _getDailyVolumes(messages);

      // how many hours ago was the last contact?
      now = moment().utc();
      sinceLastIn = 0;
      sinceLastOut = 0;
      if (lastInbound) {
        sinceLastIn = now.diff(moment(lastInbound.created).utc(), 'hours');
      }
      if (lastOutbound) {
        sinceLastOut = now.diff(moment(lastOutbound.created).utc(), 'hours');
      }
      sinceLast = sinceLastOut > sinceLastIn ? sinceLastOut : sinceLastIn;

      // track the profile view
      analyticsService.track(null, 'client_profile_view', req, res.locals, {
        ccc_id: clientId,
        ccc_active: res.locals.client.active,
        unread_messages: unreadCount > 0,
        hours_since_message: sinceLast,
      });

      res.render('clients/profile', {
        hub: {
          tab: 'profile',
          sel: null,
        },
        messages: {
          all: messages,
          dailyCounts,
          unreadCount,
          inboundCount,
          outboundCount,
          sentiment,
          averageClientResponseTime: averageClientResponseTime || 0,
          averageUserResponseTime: averageUserResponseTime || 0,
          lastInbound,
          lastOutbound,
        },
        communications,
        lastCommuncationUsed,
        otherPotentialManagers,
      });
    }).catch(res.error500);
  },

};
