

// Libraries
const db = require('../../app/db');
const Promise = require('bluebird');


// Class
class DepartmentSupervisors {

  static findByDepartmentIDs(departmentIDArray, active) {
    if (typeof active === 'undefined') active = true;
    return new Promise((fulfill, reject) => {
      db('department_supervisors')
        .select('department_supervisors.*',
                'cms.cmid',
                'cms.first',
                'cms.middle',
                'cms.last')
        .leftJoin('cms', 'cms.cmid', 'department_supervisors.supervisor')
        .whereIn('department_supervisors.department', departmentIDArray)
        .andWhere('department_supervisors.active', active)
      .then((supervisors) => {
        fulfill(supervisors);
      }).catch(reject);
    });
  }

  static updateSupervisors(departmentID, supervisorIDArray, revertClass) {
    supervisorIDArray = supervisorIDArray.map(supervisorID => Number(supervisorID)).filter(supervisorID => !isNaN(supervisorID));
    let activeSupervisors;
    return new Promise((fulfill, reject) => {
      db('department_supervisors')
        .whereIn('supervisor', supervisorIDArray)
        .andWhere('department', departmentID)
        .update({ active: true })
        .returning('supervisor')
      .then((updatedSupervisors) => {
        activeSupervisors = updatedSupervisors;
        return db('department_supervisors')
        .whereNotIn('supervisor', supervisorIDArray)
        .andWhere('department', departmentID)
        .update({ active: false });
      }).then(() => {
        const remainingSupervisors = supervisorIDArray.filter(ID => activeSupervisors.indexOf(ID) < 0);
        return DepartmentSupervisors.createSupervisors(departmentID, remainingSupervisors);
      }).then(() => DepartmentSupervisors.updateUserStatuses(departmentID, supervisorIDArray, revertClass)).then(() => {
        fulfill();
      }).catch(reject);
    });
  }

  static updateSupervisor(departmentID, supervisorID, activeStatus) {
    if (typeof activeStatus === 'undefined') activeStatus = true;
    return new Promise((fulfill, reject) => {
      db('department_supervisors')
        .where('supervisor', supervisorID)
        .andWhere('department', departmentID)
        .update({ active: activeStatus })
        .returning('supervisor')
      .then((updatedSupervisors) => {
        if (updatedSupervisors.length > 0) {
          DepartmentSupervisors.createSupervisor(departmentID, supervisorID)
          .then(() => {
            fulfill();
          }).catch(reject);
        } else {
          fulfill();
        }
      }).catch(reject);
    });
  }


  static updateUserStatuses(departmentID, supervisorIDArray, revertClass) {
    if (typeof revertClass === 'undefined') revertClass = 'primary';
    return new Promise((fulfill, reject) => {
      db('cms')
        .whereIn('cmid', supervisorIDArray)
        .andWhere('department', departmentID)
        .update({ class: 'supervisor' })
      .then(() => db('cms')
        .whereNotIn('cmid', supervisorIDArray)
        .andWhere('department', departmentID)
        .update({ class: revertClass })).then(() => {
          fulfill();
        }).catch(reject);
    });
  }


  static createSupervisor(departmentID, supervisorID) {
    return new Promise((fulfill, reject) => {
      DepartmentSupervisors.createSupervisors(departmentID, [supervisorID,])
      .then(() => {
        fulfill();
      }).catch(reject);
    });
  }

  static createSupervisors(departmentID, supervisorIDArray) {
    return new Promise((fulfill, reject) => {
      const supervisorArray = supervisorIDArray.map(supervisorID => ({
        department: departmentID,
        supervisor: supervisorID,
        active: true,
      }));
      db('department_supervisors')
        .insert(supervisorArray)
      .then(() => {
        fulfill();
      }).catch(reject);
    });
  }

}

module.exports = DepartmentSupervisors;

