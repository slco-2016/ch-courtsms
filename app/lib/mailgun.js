const resourceRequire = require('./resourceRequire')
const request = require('request');
const credentials = require('../../credentials')
const Promise = require("bluebird");

const mock = resourceRequire('lib', 'mock')

module.exports = {
  sendEmail(to, from, subject, content) {
    return new Promise((fulfill, reject) => {
      if (mock.isEnabled()) {
        fulfill({
          id: '<2013FAKE82626.18666.16540@clientcomm.org>',
          message: 'queued',
        })
      } else {
        request.post(
          {
            url: "https://api.mailgun.net/v3/clientcomm.org/messages",
            formData: {
              from: from,
              to: to,
              subject: subject,
              html: content,
              "o:tracking-opens":1,
            },
            auth: {
              user: 'api',
              password: credentials.mailgun.apiKey,
            },
          }
        ,(error, response, body) => {
          if (error) {
            reject(error);    
          } else {
            jsonBody = JSON.parse(body)
            if (jsonBody.message === "Queued. Thank you.") {
              jsonBody.message = "queued"
            }
            console.log(jsonBody)
            fulfill(jsonBody);    
          }
        })                
      }
    })
  },
}