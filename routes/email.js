const mimelib = require('mimelib');
const sms = require("../utils/utils").sms;
const credentials = require('../credentials')
const request = require('request');

const Message = require('../models/models').Message

module.exports = function (app) {

  app.get("/email/attachment-viewer/", function(req, res) {
    // test
    // {
    //     "url": "https://si.api.mailgun.net/v3/domains/clientcomm.org/messages/eyJwIjpmYWxzZSwiayI6ImFkNzc3ZjY2LWI3ZTEtNGM1Zi05ODIwLWFmMWY2ODNmYmJhOCIsInMiOiIwMmZiY2Q3M2EwIiwiYyI6InNiaWFkIn0=/attachments/0",
    //     "content-type": "image/png",
    //     "name": "thumbnail-_0000_Lob-Postcards-1.png",
    //     "size": 143168
    // }
    // http://localhost:4000/email/attachment-viewer/?contentType=image/png&url=https%3A%2F%2Fsi.api.mailgun.net%2Fv3%2Fdomains%2Fclientcomm.org%2Fmessages%2FeyJwIjpmYWxzZSwiayI6ImFkNzc3ZjY2LWI3ZTEtNGM1Zi05ODIwLWFmMWY2ODNmYmJhOCIsInMiOiIwMmZiY2Q3M2EwIiwiYyI6InNiaWFkIn0%3D%2Fattachments%2F0

    // This might be cool, might be horrible

    let url = req.query.url
    let contentType = req.query.contentType
    let name = req.query.name

    if (req.user) {
      res.writeHead(200, {
        'Content-Type': contentType,
      });
      request.get({
        url: url,
        auth: {
            user: 'api',
            password: credentials.mailgun.apiKey,
        },
      }).pipe(res)
    } else {
      res.send('404', 404)
    }

  })

  app.post("/email/webhook", function(req, res) {
    let event = req.body.event
    console.log(req.body)
    if (event == "delivered") {
      let messageId = req.body['Message-Id']
      Message.findByPlatformId(messageId)
      .then((message) => {
        message.tw_status = "Delivered"
        message.save()
      }).catch((err) => {
        console.log(err)
      })
    } else if (event == "opened") {
      let messageId = `<${req.body['message-id']}>`
      // why, just why
      
      Message.findByPlatformId(messageId)
      .then((message) => {
        message.tw_status = "Opened"
        message.save()
      }).catch((err) => {
        console.log(err)
      })
    }

    // TODO "open" event

    res.send('ok, thanks');
  })

  app.post("/email", function (req, res) {
    // mailgun's philosophy here seems to be that if they can populate a section they
    // will, or they will omit it. This can be very confusing.
    // eg: if there is one recipient they will populate "recipient", but they
    // will populate "reciepients" if there are multiple.
    // would keep this in mind when trusing these values.

    console.log(req.body)

    var domain = req.body.domain;
    var headers = req.body['message-headers'];
    var messageId = req.body['Message-Id'];
    var recipient = req.body.recipient;
    var event = req.body.event;
    var timestamp = req.body.timestamp;
    var token = req.body.token;
    var signature = req.body.signature;
    var recipient = req.body.recipient; 
    var bodyPlain = req.body['body-plain'];

    var cleanBody = req.body['stripped-text'] || req.body['body-plain']

    var fromAddress = mimelib.parseAddresses(req.body.From)[0]
    var toAddresses = mimelib.parseAddresses(req.body.To)

    console.log(fromAddress)
    console.log(toAddresses)
    console.log(`Email arrived for ${recipient}`)
    console.log(`Content is \n${cleanBody}`)
    
    res.send('ok, thanks');

    let attachments = req.body.attachments

    sms.process_incoming_msg(
        fromAddress.address, 
        [cleanBody], 
        "email",
        "delivered",
        messageId
    ).then((msgs) =>{
        console.log(msgs)
    }).catch((err) => {
        res.status(500).send(err)
    })

  });

};
