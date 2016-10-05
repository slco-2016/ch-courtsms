const resourceRequire = require('./resourceRequire')
const request = require('request');
const credentials = require('../../credentials')
const Promise = require("bluebird");

const mock = resourceRequire('lib', 'mock')

mailgunReq = (method, path, data, callback) => {
  request({
    method: method,
    url: "https://api.mailgun.net/v3/" + path,
    formData: data,
    auth: {
      user: 'api',
      password: credentials.mailgun.apiKey,
    },
  }, callback)  
}

module.exports = {
  sendEmail(to, from, subject, content) {
    return new Promise((fulfill, reject) => {
      if (mock.isEnabled()) {
        fulfill({
          id: '<2013FAKE82626.18666.16540@clientcomm.org>',
          message: 'queued',
        })
      } else {
        mailgunReq('post', 'clientcomm.org/messages', {
          from: from,
          to: to,
          subject: subject,
          html: content,
          "o:tracking-opens":1,
        }, (error, response, body) => {
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
  updateWebhooks(domain, hostUrl) {
    mailgunReq(
      'put',
      `${domain}/webhooks/deliver`, 
      {url: hostUrl + "webhool/email/status"}, 
      (error) => {
        if (error) { reject(error) }
        mailgunReq(
          'put',
          `${domain}/webhooks/open`, 
          {url: hostUrl + "webhool/email/status"}, 
          (error) => {
            if (error) { reject(error) }
          }
        )
      }
    )
  }
}