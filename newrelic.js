const credentials = require('./credentials');

exports.config = {
  app_name: [`clientcomm_${credentials.clientcommInstanceName}`],
  license_key: credentials.newrelic.key,
  logging: {
    level: 'info',
  },
};
