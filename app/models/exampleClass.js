'use strict';

// Libraries
const db      = require("../../app/db");
const Promise = require("bluebird");


// TO DOS
// Check if arrays are indeed arrays and that they have length > 0


// Classes
class Example {

  static create (orgID, name, ownerID, creatorID, color) {
    return new Promise((fulfill, reject) => {
      // Color is optional
      if (!color) color = null;

      const requiredVariables = [orgID, name, ownerID, creatorID, color];
      const someValsMissing = undefinedValuesCheck(requiredVariables);

      // Reject if not all values are present
      if (someValsMissing) {
        reject("Missing required variables.")

      // Run INSERT if someValsMissing clears
      } else {
        db("Examples")
        .insert({
          org:        orgID,
          name:       name,
          color:      color,
          owner:      ownerID,
          created_by: creatorID

        })
        .returning("Example_id")
        .then((ExampleIDs) => {
          fulfill(ExampleIDs[0]);

        }).catch(reject);
      }
    });
  }

}

module.exports = Example