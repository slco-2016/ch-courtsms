'use strict';

// Libraries
const db      = require('../db');
const Promise = require('bluebird');

class SentimentAnalysis {

  static logIBMSentimentAnalysis (message) {
    let ibm = null;
    if (message.hasOwnProperty('AddOns')) {
      try {
        message.AddOns = JSON.parse(message.AddOns);
      } catch (e) {
        message.AddOns = {status: null,};
      }
      
      const status = message.AddOns.status;
      if (status && status == 'successful') {
        const results = message.AddOns.results;
        if (results && results.hasOwnProperty('ibm_watson_sentiment')) {
          ibm = results.ibm_watson_sentiment;
        }
      }
    }

    if (ibm && ibm.status=='successful') {
      const requestSID = null;
      const docSentiment = null;

      // Use a try statement because we are relying on a very
      // particular object structure for type, request, etc.
      try { 
        const type = ibm.result.docSentiment.type;
        const requestSid = ibm.request_sid;
        const MessageSid = message.MessageSid;

        const insertObj = {
          sentiment: type,
          ibm_request_sid: requestSid,
          tw_sid: MessageSid,
        };

        db('ibm_sentiment_analysis')
        .insert(insertObj)
        .then((success) => { 
        }).catch((error) => {
          console.log('Error when isnerting on ibm_sentiment_analysis: ', error);
        });
        
      } catch (e) { console.log(e); }
    }
  }

}

module.exports = SentimentAnalysis;