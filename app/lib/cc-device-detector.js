const detector = require('device-detector');

module.exports = {
  parse(userAgent) {
    let parsed = detector.parse(userAgent);

    // check for values that device-detector doesn't know about
    var isNewRelic = /newrelicpinger/i.test(parsed.userAgent);

    if (isNewRelic) {
      parsed.type = 'Bot';
      parsed.engine = 'NewRelicPinger';
      parsed.os = '';
      parsed.browser = '';
    }

    return parsed;
  },
};
