const baseProductionReadyCredentials = {
  CCENV: process.env.CCENV,
  RECEIVEBACKUPMODE: false,
  RUNSCHEDULED: !!process.env.RUNSCHEDULED,
  // Twilio-related
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  baseUrl: process.env.BASE_URL,
  twilioNum: process.env.TWILIO_NUM, // e.g. '+12344564563'
  twilio: {
    // e.g. 'http://ecx-x-x-xx.us-xxx.compute.amazonaws.com'
    outboundCallbackUrl: process.env.TWILIO_OUTBOUND_CALLBACK_URL,
    outboundCallbackUrlBackup: process.env.TWILIO_OUTBOUND_CALLBACK_URL_BACKUP,
  },
  sessionSecret: process.env.SESSION_SECRET,
  localDbUser: process.env.LOCAL_DATABASE_USER,
  db: {
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    host: process.env.DATABASE_HOST,
  },
  // Currently we use Gmail Node library for email comms
  em: {
    password: process.env.GMAIL_PASSWORD,
  },
  newrelic: {
    key: process.env.NEWRELIC_KEY,
  },
  mailgun: {
    apiKey: process.env.MAILGUN_API_KEY,
  },
  aws: {
    accessKey: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  s3: {
    bucketName: process.env.S3_BUCKET_NAME,
  },
};

const colors = require('colors');
const hostName = baseProductionReadyCredentials.db.host.split('.')[0];
console.log(`Database being used: ${hostName}'`.yellow);

module.exports = baseProductionReadyCredentials;
