const request = require('request');
const credentials = require('../../credentials')
const Promise = require("bluebird");

const aws = require('aws-sdk')
aws.config.credentials = new aws.Credentials(
  credentials.aws.accessKey,
  credentials.aws.secretAccessKey
)

const s3 = new aws.S3({ apiVersion: '2006-03-01' })

const bucketName = "clientcomm-attachments"

module.exports = {

  getTemporaryUrl(key) {
    let tenMinutes = 600;
    let params = {Bucket: bucketName, Key: key, Expires: tenMinutes};
    let url = s3.getSignedUrl('getObject', params)
    return url
  },

  uploadFile(requestParams, name) {
    return new Promise((fulfill, reject) => {
      let token = Math.random().toString(36).substring(7);
      let key = `${token}-${name}`

      requestParams.encoding = null

      request.get(requestParams, (err, res, body) => {
        if (err) {
          reject(err)
        } else {

          let params = {
            Bucket: bucketName,
            Key: key,
            Body: body,
            ContentType: res.headers['content-type'],
            ContentLength: res.headers['content-length'],
          };

          s3.putObject(params, function(err, data) {
            if (err) {
              reject(err)
            } else {
              fulfill(key)
            }
          });          
        }
      })
    })
  },

  uploadMailGunAttachment(details) {
    let requestParams = {
      url: details.url,
      auth: {
        user: 'api',
        password: credentials.mailgun.apiKey,
      }
    }
    let name = details.name
    // let contentType = details['content-type']
    return this.uploadFile(requestParams, name)
  },
  
}