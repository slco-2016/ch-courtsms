

// Libraries
const db = require('../../app/db');
const Promise = require('bluebird');
const BaseModel = require('../lib/models').BaseModel;

const moment = require('moment');
const momentTz = require('moment-timezone');

const resourceRequire = require('../lib/resourceRequire');

const Alerts = resourceRequire('models', 'Alerts');
const Conversations = resourceRequire('models', 'Conversations');
const Messages = resourceRequire('models', 'Messages');
const OutboundVoiceMessages = resourceRequire('models', 'OutboundVoiceMessages');
const Users = resourceRequire('models', 'Users');

const voice = resourceRequire('lib', 'voice');


// Class
class Notifications extends BaseModel {

  constructor(data) {
    super({
      data,
      columns: [
        'notificationid',
        'cm',
        'client',
        'comm',
        'subject',
        'message',
        'created',
        'updated',
        'send',
        'repeat',
        'frequency',
        'sent',
        'closed',
        'repeat_terminus',
        'ovm_id',
      ],
    });
  }

  // TODO: this is presently a model function
  //       but probably should be in a lib on its own
  static checkAndSendNotifications() {
    console.log('-> checkAndSendNotifications');
    return new Promise((fulfill, reject) => {
      // look for all notifications that are planned
      // but have not been sent and have NOT been closed
      // (note: closing is basically deleting on the user's end)
      db('notifications')
        .where('send', '<', db.fn.now())
        .andWhere('notifications.sent', false)
        .andWhere('notifications.closed', false)
      .then(notifications => {

        console.log(` -- found ${notifications.length} eligible notifications`);
        // creating a promise map
         return new Promise((fulfill, reject) => {
           fulfill(notifications);
         })

      // this is for each in the returned prior notifications basically
      // at this point we need to decide if that message is a voice or nonvoice message
      }).map((notification) => {
        // Voice: if voice, send an outbound voice message notification
        if (notification.ovm_id) {
          console.log(` -- sending a scheduled voice message (${notification.notificationid})`);
          return this.sendOVMNotification(notification);

        // Email or Text: otherwise proceed with the text/sms/email message method
        }
        console.log(` -- sending a scheduled text message (${notification.notificationid})`);
        return this.sendTextorEmailNotification(notification);

      // it will then return an array of resulting notifications that have been sent
      }).then(notifications =>
        // yet another promise array
         new Promise((fulfill, reject) => {
           fulfill(notifications);
         })

      // map over the resulting sent notifications
      // and create an in-app alert for the case manager/user
      // so that they know their message was sent
      ).map((notification) => {
        console.log(` -- creating a notification alert`);
        const targetUserId = notification.cm;
        const createdByUserId = notification.cm;
        const subject = 'Notification Sent';
        const message = `Message subject \"${notification.subject}\" was sent and will appear as a sent message in the conversation stream.`;
        return Alerts.createForUser(targetUserId, createdByUserId, subject, message);
      }).then(() => {
        fulfill();
      }).catch(reject);
    });
  }

  static sendOVMNotification(notification) {
    console.log('-> sendOVMNotification');
    return new Promise((fulfill, reject) => {
      let fromUser;
      Users.findById(notification.cm)
        .then(user => {
          fromUser = user;
          return OutboundVoiceMessages.findById(notification.ovm_id);
        })
        .then(ovm => {
          return voice.processPendingOutboundVoiceMessages(ovm, fromUser);
        })
        .then(() => {
          fulfill(notification);
        })
        .catch(reject);
    });
  }

  static sendTextorEmailNotification(notification) {
    return new Promise((fulfill, reject) => {
      Users.findById(notification.cm)
      .then((user) => {
        const client = notification.client;
        const userId = notification.cm;
        const clientId = notification.client;
        const subject = notification.subject || `New Message from ${user.first} ${user.last}`;
        const content = notification.message;
        const commId = notification.comm;
        let sendMethod;

        if (commId) {
          sendMethod = Messages.startNewConversation(userId, clientId, subject, content, commId);
        } else {
          sendMethod = Messages.smartSend(userId, clientId, subject, content);
        }

        sendMethod.then(() => this.markAsSent(notification.notificationid)).then(() => {
          fulfill(notification);
        }).catch(reject);
      }).catch(reject);
    });
  }

  static markAsSent(notificationId) {
    return new Promise((fulfill, reject) => {
      db('notifications')
      .where('notificationid', notificationId)
      .update({
        sent: true,
      }).then(() => {
        fulfill();
      }).catch(reject);
    });
  }

  static findByUser(userID, sent) {
    if (typeof sent === 'undefined') sent = false;
    const order = sent ? 'desc' : 'asc';

    return new Promise((fulfill, reject) => {
      db('notifications')
        .leftJoin(
          db('clients')
            .select(db.raw('??, ??, ??, clid', ['first', 'middle', 'last']))
            .as('clients'),
          'clients.clid', 'notifications.client')
        .where('cm', userID)
        .andWhere('sent', sent)
        .andWhere('closed', false)
        .orderBy('send', order)
      .then((notifications) => {
        fulfill(notifications);
      }).catch(reject);
    });
  }

  static findByClientID(clientId, sent) {
    if (typeof sent === 'undefined') sent = false;
    const order = sent ? 'desc' : 'asc';

    return new Promise((fulfill, reject) => {
      db('notifications')
        .leftJoin(
          db('clients')
            .select(db.raw('?? as first, ?? as middle, ?? as last, clid', ['first', 'middle', 'last']))
            .as('clients'),
          'clients.clid', 'notifications.client')
        .leftJoin(
          db('cms')
            .select(db.raw('?? as creator_first, ?? as creator_last, department as creator_department, cmid as creator_id', ['first', 'last']))
            .as('cms'),
          'cms.creator_id', 'notifications.cm')
        .leftJoin(
          db('commconns')
            .select(db.raw('?? as communication_name, comm, commconnid', ['name']))
            .where('client', clientId)
            .as('commconns'),
            'commconns.comm', 'notifications.comm')
        .where('client', clientId)
        .andWhere('sent', sent)
        .andWhere('closed', false)
        .orderBy('send', order)
      .then((notifications) => {
        fulfill(notifications);
      }).catch(reject);
    });
  }

  static findByID(notificationID) {
    return new Promise((fulfill, reject) => {
      db('notifications')
        .where('notificationid', notificationID)
        .limit(1)
      .then((notifications) => {
        fulfill(notifications[0]);
      }).catch(reject);
    });
  }

  static removeOne(notification) {
    return new Promise((fulfill, reject) => {
      db('notifications')
        .update({ closed: true })
        .where('notificationid', notification)
        .returning('*')
      .then((n) => {
        fulfill(n[0]);
      }).catch(reject);
    });
  }

  static editOne(notificationID, clientID, commID, send, subject, message) {
    if (!commID || commID == 'null') commID = null;
    const f = moment(send).format('ha z');
    console.log('SEND ', f);

    return new Promise((fulfill, reject) => {
      db('notifications')
        .update({
          client: clientID,
          comm: commID,
          subject,
          message,
          send,
        })
        .where('notificationid', notificationID)
        .returning('*')
      .then((n) => {
        fulfill(n[0]);
      }).catch(reject);
    });
  }

  static create(userID, clientID, commID, subject, message, send, ovmId) {
    return new Promise((fulfill, reject) => {
      db('notifications')
        .insert({
          cm: userID,
          client: clientID,
          comm: commID,
          subject,
          message,
          send,
          ovm_id: ovmId || null,
          repeat: false,
          frequency: null,
          sent: false,
          closed: false,
          repeat_terminus: null,
        })
        .returning('*')
      .then((notifications) => {
        this._getSingleResponse(notifications, fulfill);
      }).catch(reject);
    });
  }

}

Notifications.primaryId = 'notificationid';
Notifications.tableName = 'notifications';

module.exports = Notifications;
