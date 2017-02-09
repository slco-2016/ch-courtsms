// Fade out flash alerts after .75 seconds
setTimeout(() => { $('.FLASH').fadeOut('slow'); }, 1500);

// Alert feed controls
$('.alertsBindedClickAction').click(() => {
  $('.hiddenAlerts').toggle();
});

$('.hiddenAlerts .alertRow .close').click(removeAlert);

function removeAlert(altThis) {
  let that;
  if (altThis && altThis.type !== 'click') {
    that = altThis;
  } else {
    that = this;
  }

  const alertId = $(that).attr('alertID');
  if (alertId) {
    submitAlertClosure(alertId);
  }
  $(that).parent().remove();
  const nr = $('.numberRemaining');
  nr.text(Number(nr.text()) - 1); // reduce the remaining alerts by one
  if ($('.hiddenAlerts .alertRow').length == 0) $('.alerts').remove();
}

function clearAllAlerts() {
  $('.alertRow').find('.close').each((i, ea) => {
    removeAlert(ea);
  });
}

function submitAlertClosure(alertId) {
  $.get(`/alerts/${alertId}/close`)
  .fail((error) => {
    console.log(`${error.status}: ${error.statusText}`);
  });
}

// this allows pages that have lists of information to be sorted
function sortBy(dataLabel) {
  const tagName = `data-${dataLabel}`;
  const $wrapper = $('.coreContent');

  const all = $wrapper.find(`[${tagName}]`);
  if (all.length > 1) {
    const first = all[0];
    const last = all[all.length - 1];
    const direction = first.getAttribute(tagName) > last.getAttribute(tagName);

    // adapted from http://stackoverflow.com/questions/14160498/sort-element-by-numerical-value-of-data-attribute
    all.sort((a, b) => {
      const contentA = a.getAttribute(tagName);
      const contentB = b.getAttribute(tagName);
      if (direction) {
        return (contentA < contentB) ? -1 : (contentA > contentB) ? 1 : 0;
      }
      return (contentB < contentA) ? -1 : (contentB > contentA) ? 1 : 0;
    }).appendTo($wrapper);
  }
}

var checkingForNewMessages = setInterval(() => {
  $.get('/alerts')
    .then((res) => {
      if (res && res.newMessages) {
        if (res.newMessages.active || res.newMessages.inactive) {
          // increment the number of alerts
          let number = Number($('.numberRemaining').text());
          if (isNaN(number)) {
            number = 0;
          }
          number += 1;

          // append the new alert to the alerts list
          const hrefLink = res.newMessages.active ? '<a href="/clients">' : '<a href="/clients?status=archived">';
          $('.numberRemaining').text(number);
          $('.alerts').fadeIn();
          $('.receivesNewAlertsHere').prepend(`${'<div class="alertRow">' +
                                    '<div class="message">'}${hrefLink
                                        }You have new unread messages. ` +
                                        'Click to view.' +
                                      '</a>' +
                                    '</div>' +
                                    '<div class="close">' +
                                      '<i class="fa fa-check-circle" aria-hidden="true"></i>' +
                                    '</div>' +
                                  '</div>');
          $('.hiddenAlerts .alertRow .close').click(removeAlert); // need to bind action

          // stop checking for new alerts
          clearInterval(checkingForNewMessages);

          // make a dinging noise
          if (SESSION_USER && SESSION_USER.alert_beep) {
            try {
              new Audio('/static/sounds/alert.mp3').play();
            } catch (e) {
              console.log('Error playing the beep noise on a new alert: ', error);
            }
          }
        }
      } else {
        console.log('No associated logged in account.');
        clearInterval(checkingForNewMessages);
      }
    }).fail((error) => {
      console.log(`${error.status}: ${error.statusText}`);
    });
}, 4000);

(function () {
  const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
  if (!isChrome) {
    const notice = $('.miniChromeBrowserDownloadPrompt');
    notice.show();
    setTimeout(() => {
      notice.fadeOut();
    }, 5000);
  }
}());

// Dynamically set coreContent if it exists to height of page
function adjustCoreContentBoxSize() {
  $('.coreContent').height($(window).height() - 97);
}

$(window).resize(adjustCoreContentBoxSize);
adjustCoreContentBoxSize();

// Google analytics
(function (i, s, o, g, r, a, m) {
  i.GoogleAnalyticsObject = r; i[r] = i[r] || function () {
    (i[r].q = i[r].q || []).push(arguments);
  }, i[r].l = 1 * new Date(); a = s.createElement(o),
m = s.getElementsByTagName(o)[0]; a.async = 1; a.src = g; m.parentNode.insertBefore(a, m);
}(window, document, 'script', '//www.google-analytics.com/analytics.js', 'ga'));
ga('create', 'UA-74523546-1', 'auto');
ga('send', 'pageview');
