let baseProductionReadyCredentials = {

  // Boolean for keeping track of whether or not in test mode without having to use process.env
  testEnvironment: false,
  
  // BELOW: Main body of the credentials object

  // Root url, for testing something like https://16eb4a25.ngrok.io
  rootUrl: 'http://localhost:4000',

  // Twilio-related
  accountSid: '****************',
  authToken: '****************',
  twilioNum: '+12345678901',

  // Session
  sessionSecret: 'foobar',

  // For test use
  // TO DO: roll this in as a modification when in test env
  localDbUser: 'janedoe',

  // Connection to production database
  db: {
    user:     'jane',
    password: 'password',
    host:     'foobar.abc123.us-west-1.rds.amazonaws.com',
  },

  // Currently we use Gmail Node library for email comms
  em: {
    password: 'gmailpassword',
  },

  // New Relic monitoring information
  newrelic: {
    key: 'abc123efg456',
  },

  mailgun: {
    apiKey: 'fake-key',
  },

  // AWS interface/access secrets
  aws: {
    accessKey: '****************',
    secretAccessKey: '****************',
  },
};

// Changes made when in test mode
const TESTENV = process.env.TESTENV;
if (TESTENV && TESTENV == 'true') {
  baseProductionReadyCredentials.testEnvironment = true;

  // Update to the test number that we use (so as to not use production Twilio phone number)
  baseProductionReadyCredentials.twilioNum = '+15671234567';
  baseProductionReadyCredentials.testRecipientNumber = '+13459057365';

  baseProductionReadyCredentials.db = {
    user:     'jane',
    password: 'password',
    host:     'foobar-staging.abc123.us-west-1.rds.amazonaws.com',
  };

  console.log('Credentials have been modified with test environment values.');
  console.log('Database being used: ' + baseProductionReadyCredentials.db.host.split('.')[0]);
}

module.exports = baseProductionReadyCredentials;