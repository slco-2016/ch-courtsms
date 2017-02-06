const db = require('../app/db');

db('cms')
  .limit(1)
  .then((cms) => {
    console.log(cms);
  }).catch((error) => {
    console.log(error);
  });
