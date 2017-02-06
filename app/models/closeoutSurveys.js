

// Libraries
const db = require('../../app/db');
const Promise = require('bluebird');

const BaseModel = require('../lib/models').BaseModel;

const Clients = require('./clients');
const CommConns = require('./commConns');
const Communications = require('./communications');
const Conversations = require('./conversations');
const Departments = require('./departments');
const PhoneNumbers = require('./phoneNumbers');
const Users = require('./users');

class Surveys {

  static findByOrgId(orgId) {
    return new Promise((fulfill, reject) => {
      db('client_closeout_surveys')
        .select('client_closeout_surveys.*')
        .leftJoin('clients', 'clients.clid', 'client_closeout_surveys.client')
        .leftJoin('cms', 'cms.cmid', 'clients.cm')
        .where('cms.org', orgId)
      .then((surveys) => {
        fulfill(surveys);
      }).catch(reject);
    });
  }

  static getSuccessDistributionByOrg(orgId) {
    return new Promise((fulfill, reject) => {
      this.findByOrgId(orgId)
      .then((surveys) => {
        const result = {};
        result.total = surveys.length;
        result.likelihoodSuccessWithout = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        result.helpfulness = { critical: 0, helpful: 0, neutral: 0, unhelpful: 0 };
        result.mostCommonMethod = { inPerson: 0, text: 0, phone: 0, email: 0 };
        result.closeout = { success: 0, failure: 0, stillOpen: 0 };
        surveys.forEach((survey) => {
          result.likelihoodSuccessWithout[survey.likelihood_success_without_cc] += 1;
          result.helpfulness[survey.helpfulness_of_cc] += 1;
          result.mostCommonMethod[survey.most_common_method] += 1;
          result.closeout[survey.closeout_status] += 1;
        });
        fulfill(result);
      }).catch(reject);
    });
  }

  static create(clientId, closeOutStatus,
    mostCommonMethod, likelihoodSuccessWithoutCC,
    helpfulnessCC, mostOftenDiscussed) {
    return new Promise((fulfill, reject) => {
      db('client_closeout_surveys')
        .insert({
          client: clientId,
          closeout_status: closeOutStatus,
          most_common_method: mostCommonMethod,
          likelihood_success_without_cc: likelihoodSuccessWithoutCC,
          helpfulness_of_cc: helpfulnessCC,
          most_often_discussed: mostOftenDiscussed,
        })
      .then(() => {
        fulfill();
      }).catch(reject);
    });
  }

}

module.exports = Surveys;
