var db  = require("../server/db");
var Promise = require("bluebird");

module.exports = {

  fivehundred: function (res) { 
    return function (err) {
      
      // Log the error if passed in
      if (typeof err !== "undefined") {
        console.log("\n Error occured. \n Timestamp: " + new Date());
        console.log(err);
        console.log("--- \n");
      }

      // Run the redirect
      res.redirect("/500"); 
    }
  }

}



