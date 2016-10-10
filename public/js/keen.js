!function(a,b){a("Keen","https://d26b395fwzu5fz.cloudfront.net/3.4.1/keen.min.js",b)}(function(a,b,c){var d,e,f;c["_"+a]={},c[a]=function(b){c["_"+a].clients=c["_"+a].clients||{},c["_"+a].clients[b.projectId]=this,this._config=b},c[a].ready=function(b){c["_"+a].ready=c["_"+a].ready||[],c["_"+a].ready.push(b)},d=["addEvent","setGlobalProperties","trackExternalLink","on"];for(var g=0;g<d.length;g++){var h=d[g],i=function(a){return function(){return this["_"+a]=this["_"+a]||[],this["_"+a].push(arguments),this}};c[a].prototype[h]=i(h)}e=document.createElement("script"),e.async=!0,e.src=b,f=document.getElementsByTagName("script")[0],f.parentNode.insertBefore(e,f)},this);

// Keen.io tracking operations
function createKeenClient () {
  var client = new Keen({
    projectId: "5750a91433e4063ccd5b6c7e",
    writeKey: "57bd2513349615cb4f61859fbecf3252d67cf5820f085ce7788892b314cc9399e2bfdc084c3b5f5c60712c4c48143e7f31a9eb9e78c0955228e3cf08304bb64fa4e725862dfee3ceb3bb3298600faa954e487950dbe49b2c353167d4ceaa785f"
  });
  return client;
};

// Add page event
var keenRef = {
  startTime: new Date().getTime(),
  clientPageVisitEvent: {
    user: {
      first:      SESSION_USER ? null : SESSION_USER.first,
      middle:     SESSION_USER ? null : SESSION_USER.middle,
      last:       SESSION_USER ? null : SESSION_USER.last,
      email:      SESSION_USER ? null : SESSION_USER.email,
      cmid:       SESSION_USER ? null : SESSION_USER.cmid,
      department: SESSION_USER ? null : SESSION_USER.department,
    },
    referrer: document.referrer,
    URL:      document.URL,
    keen: {
      timestamp: new Date().toISOString()
    }
  }
};

// Send the event to Keen.io
createKeenClient().addEvent("pageviews", keenRef.clientPageVisitEvent, function (err, res) { if (err) console.log(err); });

// Event bind on page unload to notify Keen of page spent duration
$(window).on("beforeunload", notifyKeenOfPageVisitDuration);
document.body.addEventListener("mousedown", notifyKeenOfPageVisitDuration, true);

// Bind exit button actions ot Keen.io call
$(".exit").click(function () { notifyKeenOfUserAction("cardexit"); });

// Bind message check button actions ot Keen.io call
$("#navbarMessageCheckButton").click(function () { notifyKeenOfUserAction("messagecheck"); });

// Tool to notify keen of duration
function notifyKeenOfPageVisitDuration () {
  // Duration maxes out at 15 minutes
  keenRef.clientPageVisitEvent.duration = Math.min((new Date().getTime() - keenRef.startTime), 900000);
  // Make the event call to Keen.io
  createKeenClient().addEvent("pagedurations", keenRef.clientPageVisitEvent, function (err, res) { 
    // In callback reset startTime
    keenRef.startTime = new Date().getTime();
  });
};