module.exports = function (app) {

  app.post("/voice", function (req, res) {
    res.send("<?xml version='1.0' encoding='UTF-8'?><Response><Say voice='woman'>Client Comm is a text only number currently. Please dial 385-468-3500 for the front desk and ask for your case manager.</Say></Response>");
  });

};
