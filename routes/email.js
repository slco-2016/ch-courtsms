var mimelib = require('mimelib');
var sms = require("../utils/utils").sms;

module.exports = function (app) {

  app.post("/email", function (req, res) {
    console.log(req.body)

    // mailgun's philosophy here seems to be that if they can populate a section they
    // will, or they will omit it. This can be very confusing.
    // eg: if there is one recipient they will populate "recipient", but they
    // will populate "reciepients" if there are multiple.
    // would keep this in mind when trusing these values.

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

    sms.get_or_create_comm_device(fromAddress.address, "email")
      .then((device) => {
        console.log(device)
      })
      .catch((err) => {console.log(err)})

  });

};
