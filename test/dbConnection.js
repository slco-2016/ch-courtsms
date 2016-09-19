var db = require("../app/db");

  db("cms")
  .limit(1)
  .then(function (cms) {
    console.log(cms);
  }).catch(function (error) {
    console.log(error);
  })