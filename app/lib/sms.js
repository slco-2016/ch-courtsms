

// Libraries
const db = require('../db');
const Promise = require('bluebird');

const Clients = require('../models/clients');
const Departments = require('../models/departments');
const Messages = require('../models/messages');
const Users = require('../models/users');

module.exports = {

  retrieveClients(toNumber, communication) {
    let clients,
      departmentIds,
      users;
    return new Promise((fulfill, reject) => {
      // First get all departments associated with number
      Departments.findByPhoneNumber(toNumber)
      .then((resp) => {
        // Extract just the department IDs out
        departmentIds = resp.map(department => department.department_id);

        // From that resulting comm, see all clients attached by
        // active communication connections
        return Clients.findByCommId(communication.commid);
      }).then((resp) => {
        clients = resp;

        // Filter out inactive clients
        clients = clients.filter(client => client.active);

        // Get all the case managers that are related to those clients
        const allUserIdsRelatedToClients = clients.map(client => client.cm);

        // Query for the rows associated with those users (case managers)
        return Users.findByIds(allUserIdsRelatedToClients);
      }).then((resp) => {
        // Only keep the users that are in the departments that
        // are related with that toNumber
        // and make sure they are active
        users = resp.filter(user => departmentIds.indexOf(user.department) > -1).filter(user => user.active);

        // Reduce clients list to only clients that are in
        // the list of in-department users
        const userIds = users.map(user => user.cmid);
        clients = clients.filter(client => userIds.indexOf(client.cm) > -1);

        fulfill(clients);
      }).catch(reject);
    });
  },

};
