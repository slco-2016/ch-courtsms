const key = require('./credentials').newrelic.key;

exports.config = {
  app_name: ['clientcomm_userfacing'],
  license_key: key,
  logging: {
    level: 'info',
  },
};
