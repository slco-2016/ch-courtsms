// Fade out flash alerts after .75 seconds
setTimeout(function(){$(".FLASH").fadeOut("slow");},1500);

// Alert feed controls
$(".alertsBindedClickAction").click(function () {
  $(".hiddenAlerts").toggle();
});

$(".hiddenAlerts .alertRow .close").click(removeAlert);

function removeAlert () { 
  var alertId = $(this).attr("alertID");
  if (alertId) {
    submitAlertClosure(alertId);
  }
  $(this).parent().remove(); 
  var nr = $(".numberRemaining");
  nr.text(Number(nr.text())-1); // reduce the remaining alerts by one
  if ($(".hiddenAlerts .alertRow").length == 0) $(".alerts").remove();
};

function submitAlertClosure (alertId) {
  $.get("/alerts/" + alertId + "/close")
  .fail(function (error) { 
    console.log(error.status+": "+error.statusText); 
  });
};

// this allows pages that have lists of information to be sorted
function sortBy (dataLabel) {
  var tagName = 'data-' + dataLabel;
  var $wrapper = $('.coreContent');

  var all = $wrapper.find('[' + tagName + ']');
  if (all.length > 1) {
    var first = all[0];
    var last  = all[all.length - 1]
    var direction = first.getAttribute(tagName) > last.getAttribute(tagName);

    // adapted from http://stackoverflow.com/questions/14160498/sort-element-by-numerical-value-of-data-attribute
    all.sort(function(a, b) {
      var contentA = a.getAttribute(tagName);
      var contentB = b.getAttribute(tagName);
      if (direction) {
        return (contentA < contentB) ? -1 : (contentA > contentB) ? 1 : 0;
      } else {
        return (contentB < contentA) ? -1 : (contentB > contentA) ? 1 : 0;
      }
    }).appendTo($wrapper);
  }
};

var checkingForNewMessages = setInterval(function () {
  $.get("/alerts")
    .then(function (res) {
      if (res.newMessages.active || res.newMessages.inactive) {

        // increment the number of alerts
        var number = Number($(".numberRemaining").text());
        if (isNaN(number)) {
          number = 0;
        }
        number = number + 1;

        // append the new alert to the alerts list
        var hrefLink = res.newMessages.active ? '<a href="/clients">' : '<a href="/clients?status=closed">';
        $(".numberRemaining").text(number)
        $(".alerts").fadeIn();
        $(".receivesNewAlertsHere").prepend('<div class="alertRow">' +
                                  '<div class="message">' + hrefLink +
                                      'You have new unread messages. ' +
                                      'Click to view.' +
                                    '</a>' +
                                  '</div>' +
                                  '<div class="close">' +
                                    '<i class="fa fa-check-circle" aria-hidden="true"></i>' +
                                  '</div>' +
                                '</div>');
        $(".hiddenAlerts .alertRow .close").click(removeAlert); // need to bind action

        // stop checking for new alerts
        clearInterval(checkingForNewMessages);

        // make a dinging noise
        if (typeof SESSION_USER !== 'undefined' && SESSION_USER.alert_beep) {
          try {
            new Audio('/static/sounds/alert.mp3').play()
          } catch (e) {
            console.log(error); 
          }
        }
      }

    }).fail(function (error) { 
      console.log(error.status+": "+error.statusText); 
    });
}, 4000);

// Dynamically set coreContent if it exists to height of page
function adjustCoreContentBoxSize () {
  $(".coreContent").height($(window).height() - 97);
}
$(window).resize(adjustCoreContentBoxSize);
adjustCoreContentBoxSize();

// Google analytics
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','//www.google-analytics.com/analytics.js','ga');
ga('create', 'UA-74523546-1', 'auto');
ga('send', 'pageview');