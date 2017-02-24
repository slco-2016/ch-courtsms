const request = require('request');
const credentials = require('../../credentials');
const Promise = require('bluebird');

const aws = require('aws-sdk');

const mock = require('./mock');

aws.config.credentials = new aws.Credentials(
  credentials.aws.accessKey,
  credentials.aws.secretAccessKey
);

const s3 = new aws.S3({ apiVersion: '2006-03-01' });

let bucketName;
if (credentials.s3) {
  bucketName = credentials.s3.bucketName;
} else {
  console.warn('DEPRECATION WARNING: You should add "s3: { bucketName: \'clientcomm-attachments\' }" to credentials.js');
  bucketName = 'clientcomm-attachments';
}

module.exports = {

  getTemporaryUrl(key) {
    const tenMinutes = 600;
    const params = { Bucket: bucketName, Key: key, Expires: tenMinutes };
    const url = s3.getSignedUrl('getObject', params);
    return url;
  },

  uploadFile(requestParams, name) {
    return new Promise((fulfill, reject) => {
      if (mock.isEnabled()) {
        return fulfill('fake-s3-key');
      }

      const token = Math.random().toString(36).substring(7);
      const key = `${token}-${name}`;

      requestParams.encoding = null;

      request.get(requestParams, (err, res, body) => {
        if (err) {
          reject(err);
        } else {
          const params = {
            Bucket: bucketName,
            Key: key,
            Body: body,
            ContentType: res.headers['content-type'],
            ContentLength: res.headers['content-length'],
          };

          s3.putObject(params, (err, data) => {
            if (err) {
              reject(err);
            } else {
              fulfill(key);
            }
          });
        }
      });
    });
  },
  uploadFromUrl(url, name) {
    if (!name) {
      name = 'unnamed';
    }
    return this.uploadFile({ url }, name);
  },
  uploadMailGunAttachment(details) {
    const requestParams = {
      url: details.url,
      auth: {
        user: 'api',
        password: credentials.mailgun.apiKey,
      },
    };
    const name = details.name;
    // let contentType = details['content-type']
    return this.uploadFile(requestParams, name);
  },

};
