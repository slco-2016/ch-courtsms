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
  console.log($(this), "s");
  $(this).parent().remove(); 
  var nr = $(".numberRemaining");
  nr.text(Number(nr.text())-1); // reduce the remaining alerts by one
  if ($(".hiddenAlerts .alertRow").length == 0) $(".alerts").remove();
};

function submitAlertClosure (alertId) {
  $.get("/alerts/close/" + alertId)
  .fail(function (error) { 
    console.log(error.status+": "+error.statusText); 
  });
};

var checkingForNewMessages = setInterval(function () {
  $.get("/alerts")
    .then(function (res) {
      if (res.newMessages) {

        var number = Number($(".numberRemaining").text());
        if (isNaN(number)) {
          number = 0;
        }
        number = number + 1;

        $(".numberRemaining").text(number)
        $(".alerts").fadeIn();
        $(".alertsBody").append(`<div class="alertRow">
                                  <div class="message">
                                    You have new unread messages. 
                                    Click to view.
                                  </div>
                                  <div class="close">
                                    <i class="fa fa-check-circle" aria-hidden="true"></i>
                                  </div>
                                </div>`);
        $(".hiddenAlerts .alertRow .close").click(removeAlert); // need to bind action
        clearInterval(checkingForNewMessages);
      }
    }).fail(function (error) { 
      console.log(error.status+": "+error.statusText); 
    });
}, 2000);

// Google analytics
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','//www.google-analytics.com/analytics.js','ga');
ga('create', 'UA-74523546-1', 'auto');
ga('send', 'pageview');