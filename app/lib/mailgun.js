const request = require('request');
const credentials = require('../../credentials')
const Promise = require("bluebird");

module.exports = {
    sendEmail(to, from, subject, content) {
        return new Promise((fulfill, reject) => {
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
                    fulfill(jsonBody);    
                }
            })
        })
    },
}