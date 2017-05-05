const resourceRequire = require('./resourceRequire');

const request = require('request');
const Promise = require('bluebird');

const credentials = require('../../credentials');

const mailgun = require('mailgun-js')({
  apiKey: credentials.mailgun.apiKey,
  domain: (process.env.CCMAILGUNDOMAIN || 'clientcomm.org'),
});

const mock = resourceRequire('lib', 'mock');
mailgunWebhookUpdate = (name, url, callback) => {
  request({
    method: 'put',
    url: `https://api.mailgun.net/v3/domains/clientcomm.org/webhooks/${name}`,
    formData: { url },
    auth: {
      user: 'api',
      password: credentials.mailgun.apiKey,
    },
  }, callback);
};

module.exports = {
  sendEmail(to, from, subject, content) {
    return new Promise((fulfill, reject) => {
      mailgun.messages().send({
        from,
        to,
        subject,
        html: content,
        'o:tracking-opens': 1,
      }, (error, body) => {
        if (error) {
          reject(error);
        } else {
          console.log(body);
          if (body.message === 'Queued. Thank you.') {
            body.message = 'queued';
          }
          fulfill(body);
        }
      });
    });
  },

  updateWebhooks(hostUrl) {
    return new Promise((fulfill, reject) => {
      mailgunWebhookUpdate(
        'deliver',
        `${hostUrl}/webhook/email/status`,
        (error, resp, body) => {
          if (error) { return reject(error); }
          mailgunWebhookUpdate(
            'open',
            `${hostUrl}/webhook/email/status`,
            (error, resp, body) => {
              if (error) { return reject(error); }
              mailgun.routes().list((error, routes) => {
                if (error) { return reject(error); }
                routes.items.forEach((route) => {
                  if (route.description === 'Catch all') {
                    mailgun.routes(route.id).update({
                      action: `store(notify="${hostUrl}/webhook/email")`,
                    }, (error, body) => {
                      if (error) { return reject(error); }
                      fulfill(body);
                    });
                  }
                });
              });
            }
          );
        }
      );
    });
  },
};
