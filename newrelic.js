const credentials = require('./credentials');

exports.config = {
  app_name: [credentials.newrelic.appName],
  license_key: credentials.newrelic.key,
  logging: {
    level: 'info',
  },
};
