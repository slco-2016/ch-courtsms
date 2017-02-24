!(function (a, b) { a('Keen', 'https://d26b395fwzu5fz.cloudfront.net/3.4.1/keen.min.js', b); }((a, b, c) => {
  let d,
    e,
    f; c[`_${a}`] = {}, c[a] = function (b) { c[`_${a}`].clients = c[`_${a}`].clients || {}, c[`_${a}`].clients[b.projectId] = this, this._config = b; }, c[a].ready = function (b) { c[`_${a}`].ready = c[`_${a}`].ready || [], c[`_${a}`].ready.push(b); }, d = ['addEvent', 'setGlobalProperties', 'trackExternalLink', 'on']; for (var g = 0; g < d.length; g++) {
      let h = d[g],
        i = function (a) { return function () { return this[`_${a}`] = this[`_${a}`] || [], this[`_${a}`].push(arguments), this; }; }; c[a].prototype[h] = i(h);
    }e = document.createElement('script'), e.async = !0, e.src = b, f = document.getElementsByTagName('script')[0], f.parentNode.insertBefore(e, f);
}, this));

// Keen.io tracking operations
function createKeenClient() {
  const client = new Keen({
    projectId: window.clientcomm.keenProjectId,
    writeKey: window.clientcomm.keenWriteKey,
  });
  return client;
}

// Add page event
const keenRef = {
  startTime: new Date().getTime(),
  clientPageVisitEvent: {
    user: {
      first: SESSION_USER ? SESSION_USER.first : null,
      middle: SESSION_USER ? SESSION_USER.middle : null,
      last: SESSION_USER ? SESSION_USER.last : null,
      email: SESSION_USER ? SESSION_USER.email : null,
      cmid: SESSION_USER ? SESSION_USER.cmid : null,
      department: SESSION_USER ? SESSION_USER.department : null,
    },
    referrer: document.referrer,
    URL: document.URL,
    keen: {
      timestamp: new Date().toISOString(),
    },
  },
};

// Send the event to Keen.io
createKeenClient().addEvent('pageviews', keenRef.clientPageVisitEvent, (err, res) => { if (err) console.log(err); });

// Event bind on page unload to notify Keen of page spent duration
$(window).on('beforeunload', notifyKeenOfPageVisitDuration);
document.body.addEventListener('mousedown', notifyKeenOfPageVisitDuration, true);

// Bind exit button actions ot Keen.io call
$('.exit').click(() => { notifyKeenOfUserAction('cardexit'); });

// Bind message check button actions ot Keen.io call
$('#navbarMessageCheckButton').click(() => { notifyKeenOfUserAction('messagecheck'); });

// Tool to notify keen of duration
function notifyKeenOfPageVisitDuration() {
  // Duration maxes out at 15 minutes
  keenRef.clientPageVisitEvent.duration = Math.min((new Date().getTime() - keenRef.startTime), 900000);
  // Make the event call to Keen.io
  createKeenClient().addEvent('pagedurations', keenRef.clientPageVisitEvent, (err, res) => {
    // In callback reset startTime
    keenRef.startTime = new Date().getTime();
  });
}
