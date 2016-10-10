module.exports = { 
  domain: 'clientcomm.org',
  my_var_1: 'Mailgun Variable #1',
  'my-var-2': 'awesome',
  'message-headers': '[["Received", "by luna.mailgun.net with SMTP mgrt 8734663311733; Fri, 03 May 2013 18:26:27 +0000"], ["Content-Type", ["multipart/alternative", {"boundary": "eb663d73ae0a4d6c9153cc0aec8b7520"}]], ["Mime-Version", "1.0"], ["Subject", "Test deliver webhook"], ["From", "Bob <bob@clientcomm.org>"], ["To", "Alice <alice@example.com>"], ["Message-Id", "<2013FAKE82626.18666.16540@clientcomm.org>"], ["X-Mailgun-Variables", "{\\"my_var_1\\": \\"Mailgun Variable #1\\", \\"my-var-2\\": \\"awesome\\"}"], ["Date", "Fri, 03 May 2013 18:26:27 +0000"], ["Sender", "bob@clientcomm.org"]]',
  'Message-Id': '<2013FAKE82626.18666.16540@clientcomm.org>',
  recipient: 'alice@example.com',
  event: 'delivered',
  timestamp: '1475103694',
  token: '1f507873b17bf014924cccbb0e62988b59549518098c62dedf',
  signature: '94a00211f153c8c56878066c481eae1518f8649cb29baab0ff9469458ae3b988',
  'body-plain': '' 
}