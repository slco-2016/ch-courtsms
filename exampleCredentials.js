const colors = require('colors');

// Environment is set with the CCENV process environment variable
// This can be set in the command line before commands 
// (e.g. CCENV=development npm start)
const CCENV = process.env.CCENV || 'development';

const baseProductionReadyCredentials = {

  // Allow access to CCENV be consistent from credentials.js
  // TODO: Update all references to CCENV to be from here
  CCENV: CCENV,

  // Twilio-related
  accountSid: '**************************',
  authToken:  '**************************',
  twilioNum:  '+12344564563',

  // TODO: Move all twilio components into a single key
  twilio: {
    outboundCallbackUrl: 'http://ec2-52-9-131-150.us-west-1.compute.amazonaws.com',
  },

  // Session
  sessionSecret: 'abcdefg',

  // For testing purposes
  // TODO: Make this something that is set when running the tests
  localDbUser: 'username',

  // Connection details for the production database
  db: {
    user:     'usernameunqiue',
    password: '**************************',
    host:     'unique.lksjdfbj3.us-west-1.rds.amazonaws.com',
  },

  // Currently we use Gmail Node library for email comms
  // TODO: Perhaps use Mailgun and stop relying on Google for outbound notifications
  em: {
    password: '**************************',
  },

  // New Relic monitoring information
  newrelic: {
    key: '**************************',
  },

  mailgun: {
    apiKey: '**************************',
  },

  // AWS interface/access secrets
  aws: {
    accessKey:       '**************************',
    secretAccessKey: '**************************',
  },

};

// Update the phone number for all non-production environments
if (CCENV !== 'production') {
  baseProductionReadyCredentials.twilioNum = '+18987327373';

  // Update the outbound URL to whatever you are using in tests/development
  // (e.g. could be a Ngrok set up, another EC2 instance, etc.)
  baseProductionReadyCredentials.twilio.outboundCallbackUrl = 'https://123abc.ngrok.io';
}

// Changes made when we are developing (e.g. staging server, different rootURL, etc.)
if (CCENV == 'development') {
  console.log('Development environment: Credentials have been modified.'.yellow);
  baseProductionReadyCredentials.db = {
    user:     'kuan',
    password: '1922Park',
    host:     'clientcomm-staging.cxzwd26pqge8.us-west-1.rds.amazonaws.com',
  };
}

const hostName = baseProductionReadyCredentials.db.host.split('.')[0];
console.log(`Database being used: ${hostName}'`.yellow);

module.exports = baseProductionReadyCredentials;