/**
 * Returns the week number for this date.  dowOffset is the day of week the week
 * "starts" on for your locale - it can be from 0 to 6. If dowOffset is 1 (Monday),
 * the week returned is the ISO 8601 week number.
 * @param int dowOffset
 * @return int
 */
Date.prototype.getWeek = function (dowOffset) {
/* getWeek() was developed by Nick Baicoianu at MeanFreePath: http://www.meanfreepath.com */

  dowOffset = typeof (dowOffset) === 'int' ? dowOffset : 0; // default dowOffset to zero
  const newYear = new Date(this.getFullYear(), 0, 1);
  let day = newYear.getDay() - dowOffset; // the day of week the year begins on
  day = (day >= 0 ? day : day + 7);
  const daynum = Math.floor((this.getTime() - newYear.getTime() -
    (this.getTimezoneOffset() - newYear.getTimezoneOffset()) * 60000) / 86400000) + 1;
  let weeknum;
    // if the year starts before the middle of a week
  if (day < 4) {
    weeknum = Math.floor((daynum + day - 1) / 7) + 1;
    if (weeknum > 52) {
      nYear = new Date(this.getFullYear() + 1, 0, 1);
      nday = nYear.getDay() - dowOffset;
      nday = nday >= 0 ? nday : nday + 7;
            /* if the next year starts before the middle of
              the week, it is week #1 of that year*/
      weeknum = nday < 4 ? 1 : 53;
    }
  } else {
    weeknum = Math.floor((daynum + day - 1) / 7);
  }
  return weeknum;
};

function _getDatesArray(startDate, stopDate) {
  const dateArray = new Array();
  let currentDate = moment(startDate).add(-1, 'day');
  stopDate = moment(stopDate).add(1, 'day');
  while (currentDate <= stopDate) {
    dateArray.push(moment(new Date(currentDate)).format('YYYY-MM-DD'));
    currentDate = currentDate.add(1, 'days');
  }
  return dateArray;
}

$(() => {
  const executors = [
    {
      cssClass: 'JStransferClient',
      execute() {
        const substringMatcher = function (strs) {
          return function findMatches(q, cb) {
            const matches = [];
            const substrRegex = new RegExp(q, 'i');
            $.each(strs, (i, str) => {
              let name = `${str.first} ${str.last}`;
              if (str.department_name) {
                name += ` (${str.department_name})`;
              }
              if (substrRegex.test(name)) matches.push(name);
            });

            cb(matches);
          };
        };

        $('.formInput .typeahead')
        .typeahead({
          hint: true,
          highlight: true,
          minLength: 1,
        },
          {
            name: 'users',
            value: 'cmid',
            source: substringMatcher(users),
            select(e, i) { console.log(e, i); },
          });

        $('#userSearch').submit((event) => {
          const selectedName = $('.tt-input').val();
          let selectedUser = null;
          users.forEach((u) => {
            let name = `${u.first} ${u.last}`;
            if (u.department_name) {
              name += ` (${u.department_name})`;
            }
            if (name == selectedName) selectedUser = u;
          });
          if (selectedUser) {
            $('#targetUser').val(selectedUser.cmid);
            return true;
          }
          event.preventDefault();
          return false;
        });
      },
    },

    {
      cssClass: 'JSfindClient',
      execute() {
        const substringMatcher = function (strs) {
          return function findMatches(q, cb) {
            const matches = [];
            const substrRegex = new RegExp(q, 'i');
            $.each(strs, (i, str) => {
              const name = `${str.first} ${str.last}`;
              if (substrRegex.test(name)) matches.push(name);
            });

            cb(matches);
          };
        };

        $('.formInput .typeahead')
        .typeahead({
          hint: true,
          highlight: true,
          minLength: 1,
        },
          {
            name: 'clients',
            value: 'clid',
            source: substringMatcher(clients),
            select(e, i) { console.log(e, i); },
          });

        $('#clientSearch').submit((event) => {
          const selectedName = $('.tt-input').val();
          let selectedClient = null;
          clients.forEach((client) => {
            const name = `${client.first} ${client.last}`;
            if (name == selectedName) selectedClient = client;
          });
          if (selectedClient) {
            $('#targetClient').val(selectedClient.clid);
            return true;
          }
          event.preventDefault();
          return false;
        });
      },
    },

    {
      cssClass: 'JSmessagesStream',
      execute(directive) {
        function toggleSubjectView(directive) {
          // first, update the subject toggle setting
          if (directive == 'off') {
            $('#subjectView-on').removeClass('selected');
            $('#subjectView-off').addClass('selected');
          } else {
            $('#subjectView-on').addClass('selected');
            $('#subjectView-off').removeClass('selected');
          }

          // next, show or hide the side convo bar
          if (directive == 'off') {
            $('.leftBar').hide();
            $('.rightContent').width(1024);
            $('.messageDiv.rightAligned').css('padding-left', '255px');
          } else {
            $('.leftBar').show();
            $('.rightContent').width(768);
            $('.messageDiv.rightAligned').css('padding-left', '0px');
          }
        }

        // bind actions to toggle control for side convos view
        $('#subjectView-on').click(() => {
          toggleSubjectView('on');
        });
        $('#subjectView-off').click(() => {
          toggleSubjectView('off');
        });

        // currently the function just works one way (you can only open it)
        // you need to refresh the page to have it back down
        function toggleTypeBox(hide) {
          if (hide == 'close') {
            // $(".full").hide();
            // $("textarea[name='content']").hide();
            // $(".name").hide();
            // // $(".actionButton").css("margin-top", "20px");
            // $("#placeHolderTypeBox").show();
            // $(".messageStream").css("margin-bottom", 150);
          } else {
            $('.full').show();
            $('#actualTypeBox').show();
            $('.name').show();
            $('.actionButton').css('margin-top', '20px');
            $('#placeHolderTypeBox').hide();
            $('.messageStream').css('margin-bottom', '200px');
            scrollLast();
          }
        }

        function adjustDivs() {
          $('.leftBar').height($(window).height() - 97);
          $('.rightContent').height($(window).height() - 97);
        }

        function scrollLast() {
          if ($('#lastMessage').length) {
            $('.rightContent').scrollTop($('.messageStream').prop('scrollHeight'));
          }
        }

        function checkSubmitValid() {
          let ok = true;
          if ($('select[name=commID]').val() == null) ok = false;
          if ($('textarea[name=content]').val().length == 0) ok = false;
          // if (ok) {
          //   $(".submit").removeClass("disabled");
          // } else {
          //   $(".submit").addClass("disabled");
          // }
          return ok;
        }

        $(window).resize(adjustDivs);

        // $(".rightContent").scroll(function() {
        //   if ($(".rightContent").scrollTop() >= 50) {
        //   toggleTypeBox("close")
        //   }
        // });
        $('#placeHolderTypeBox').click(toggleTypeBox);

        $('textarea[name=content]').keyup(checkSubmitValid);
        $('select[name=commID]').change(checkSubmitValid);

        $('.submit').click(() => {
          if (checkSubmitValid()) {
            $('#newMessage').submit();
          }
        });

        // On load actions
        $(window).ready(() => {
          try { adjustDivs(); scrollLast(); } catch (e) { console.log(e); }
        });
      },
    },

    {
      cssClass: 'JSclientIndex',
      execute() {
        // removed hover styling, ridiculous issue with overriding hover styling of .inactive not gonna deal with it
      },
    },

    {
      cssClass: 'JScreateClient',
      execute() {
        $('.subdued').click(function () {
          $(this).removeClass('subdued');
          $('input[name=subject]').val('');
        });

        // All code below is also in tranfer.ejs, so we need to have this not be copied...
        // global
        if (users) {
          const substringMatcher = function (strs) {
            return function findMatches(q, cb) {
              const matches = [];
              const substrRegex = new RegExp(q, 'i');
              $.each(strs, (i, s) => {
                const name = `${s.first} ${s.last}`;
                if (substrRegex.test(name)) matches.push(name);
              });

              cb(matches);
            };
          };

          $('.formInput .typeahead')
          .typeahead({
            hint: true,
            highlight: true,
            minLength: 1,
          },
            {
              name: 'users',
              value: 'cmid',
              source: substringMatcher(users),
              select(e, i) { console.log(e, i); },
            });

          $('#createForm').submit((event) => {
            const selectedName = $('.tt-input').val();
            let selectedUser = null;
            users.forEach((u) => {
              const name = `${u.first} ${u.last}`;
              if (name == selectedName) selectedUser = u;
            });
            if (selectedUser) {
              $('#targetUser').val(selectedUser.cmid);
              return true;
            }
            return true;
          });
        }
      },
    },

    {
      cssClass: 'JSclientSelectColor',
      execute() {
        console.log('running');

        $('.colorList').click(function () {
          const colorTag = $(this).find('.colorTag');
          const colorID = colorTag.attr('data-colorID');
          const colorTagColor = colorTag.css('background-color');
          const colorTagName = colorTag.attr('data-colorTagName');

          // update selected value
          $('#chosenColorID').val(colorID);

          // update color and name on the block
          $('.clientNameBox').css('background-color', colorTagColor);
          $('.clientColorNameSelected').text(colorTagName);
        });
      },
    },

    {
      cssClass: 'JSclientAddress',
      execute() {
        $('.subdued').click(function () {
          $(this).removeClass('subdued');
          $('input[name=subject]').val('');
        });
      },
    },

    {
      cssClass: 'JScolorsManager',
      execute() {
        $('.colorTagAdd').click(() => {
          if ($('.colorTagName').val() !== '') {
            const i = document.createElement('input');
            i.type = 'hidden';
            i.name = 'color';
            i.value = $('.jscolor').css('background-color');
            document.getElementById('addNewColorTagForm').appendChild(i);
            $('#addNewColorTagForm').submit();
          }
        });
      },
    },

    {
      cssClass: 'JSdashboard',
      execute() {
        // global initiates as empty array
        window.keenUsers = [];
        window.keenQueryClient;

        try { adjustDivs(); } catch (e) { console.log(e); }
        $(window).resize(adjustDivs);
        $(document).ready(() => {
          keenQueryClient = new Keen({
            projectId: window.clientcomm.keenProjectId,
            readKey: window.clientcomm.keenReadKey,
          });
          getAndRenderUserActivity();
        });

          // update button colors
        $('.buttonOptions button').click(function () {
          $('.buttonOptions button').removeClass('selected');
          $(this).addClass('selected');
        });

        function getAndRenderUserActivity(alternateTimeFrame) {
          if (!alternateTimeFrame) {
            alternateTimeFrame = 'this_31_days';
          }

          try {
            let numberOfDays = Number(alternateTimeFrame.replace(/[^0-9.]/g, ''));
            numberOfDays -= 1;
            $('#userActivity_numberOfDays').text(numberOfDays);
          } catch (e) {
            console.log(e);
          }

          Keen.ready(() => {
            const keenQuery = new Keen.Query('sum', {
              eventCollection: 'pagedurations',
              groupBy: ['user.first', 'user.last', 'user.department', 'user.cmid'],
              targetProperty: 'duration',
              timeframe: alternateTimeFrame,
              timezone: 'UTC',
            });
            keenQueryClient.run(keenQuery, (err, res) => {
              if (!err) {
                // make/keep keenUsers global
                keenUsers = getRelevantKeenUsers(users, res.result);
                buildUserActivityChart(keenUsers);
                $('#userActivity').parent().find('.loading').hide();

                const activeKeenUsers = keenUsers.filter(u => u.activity > 0);
                const staffCt = users.length;
                let activeStaffPercentage;
                if (staffCt) {
                  activeStaffPercentage = Math.round(activeKeenUsers.length / staffCt * 100);
                } else {
                  activeStaffPercentage = 0;
                }

                $('#activeStaffPercentage').html(`${activeStaffPercentage}<small>%</small>`);
              }
            });
          });
        }

        // bind above function to global scope
        window.getAndRenderUserActivity = getAndRenderUserActivity;

        function adjustDivs() {
          $('.leftBar').height($(window).height() - 97);
          $('.rightContent').height($(window).height() - 97);
        }

        $('#seeUsers').click(usersShowToggle);
        function usersShowToggle() {
          $('.userTab').toggle();
          $('#seeUsers').toggleClass('selected');
        }
        if (departmentFilter || userFilter) {
          usersShowToggle();
        }

        // Utility to facilitate adding of days
        Date.prototype.addDays = function (days) {
          const dat = new Date(this.valueOf());
          dat.setDate(dat.getDate() + days);
          return dat;
        };

        const usersSortedByMessagingVolume = users.sort((a, b) => b.week_count - a.week_count);
        let topAndBottomThreshold = usersSortedByMessagingVolume.length / 2;
        // let everyone be in the top if less than 5 in department
        if (topAndBottomThreshold < 5) topAndBottomThreshold = 1000000;
        for (var i = 0; i < 5; i++) {
          const top = usersSortedByMessagingVolume[i];
          const oneMore = i + 1;
          const bottom = usersSortedByMessagingVolume[usersSortedByMessagingVolume.length - oneMore];
          if (top) {
            let topname = `${top.first} ${top.last}`;
            if (i >= topAndBottomThreshold) topname = '-';
            $(`#topUser-${oneMore}`).html(topname);
          }
          if (bottom) {
            let bottomname = `${bottom.first} ${bottom.last}`;
            if (usersSortedByMessagingVolume.length - oneMore <= topAndBottomThreshold) bottomname = '-';
            $(`#bottomUser-${oneMore}`).html(bottomname);
          }
        }

        buildPerformanceChart(countsByWeek, countsByDay);

        function buildPerformanceChart(countsByWeek, countsByDay) {
          const keysWeek = countsByWeek.map(count => count.time_period);
          const keysDay = countsByDay.map(count => count.time_period);
          const valsWeek = countsByWeek.map(count => Number(count.message_count));
          const valsDay = countsByDay.map(count => Number(count.message_count));

          const firstDay = new Date(keysDay[0]);
          const lastDay = new Date(keysDay[keysDay.length - 1]);

          const newKeysDay = _getDatesArray(firstDay, lastDay);
          const newValsDay = [];
          newKeysDay.forEach((day) => {
            const i = keysDay.indexOf(day);
            if (i > -1) newValsDay.push(valsDay[i]);
            else newValsDay.push(0);
          });

          if (valsWeek.length > 1) {
            const lastWeeksData = valsWeek.pop();
            try {
              const newLastDataVal = valsWeek[valsWeek.length - 1];
              if (lastWeeksData > newLastDataVal) {
                valsWeek.push(lastWeeksData);
              }
            } catch (e) {
              console.log(e);
            }
          }

          c3.generate({
            data: {
              xs: {
                'Weekly Activity': 'x1',
                'Daily Activity': 'x2',
              },
              columns: [
                ['x1'].concat(keysWeek),
                ['x2'].concat(newKeysDay),
                ['Weekly Activity'].concat(valsWeek),
                ['Daily Activity'].concat(newValsDay),
              ],
              types: { 'Weekly Activity': 'area', 'Daily Activity': 'area' },
              colors: {
                'Weekly Activity': '#6783a1',
                'Daily Activity': '#3c5065',
              },
            },
            point: { show: false },
            legend: { hide: true },
            axis: { x: { type: 'timeseries', tick: { format: '%m/%d' } } },
            padding: { right: 0, top: 0, left: 35, bottom: 25 },
            size: { width: 750, height: 230 },
            grid: { y: { show: false }, x: { show: false } },
            bindto: '#overallGraph',
          });

          // donut percent closed clients chart
          const donutPercent = Math.floor(10000 * surveySynopsis.closeout.success / (surveySynopsis.closeout.failure + surveySynopsis.closeout.success)) / 100;
          c3.generate({
            data: {
              columns: [
                ['Unsuccessful', surveySynopsis.closeout.failure],
                ['Successful', surveySynopsis.closeout.success],
              ],
              type: 'donut' },
            color: {
              pattern: ['#e0e0e0', '#3c5065'],
            },
            donut: {
              title: `${donutPercent}%`,
              label: { format(value) { return ''; } },

            },
            legend: { show: false },
            size: { width: 150, height: 150 },
            bindto: '#clientSuccessChart',
          });
        }

        function getRelevantKeenUsers(users, keenUsers) {
          const cmids = [];
          const toKeep = [];

          keenUsers = keenUsers.filter((ea) => {
            if (departmentFilter) {
              if (userFilter) {
                return userFilter === Number(ea['user.cmid']);
              }
                // return departmentFilter == Number(ea["user.department"]);
              return true;
            } else if (userFilter) {
              return userFilter === Number(ea['user.cmid']);
            }
            return ea['user.first'] && ea['user.last'];
          }).map((ea) => {
            ea.activity = Math.ceil((ea.result / (1000 * 60 * 60)) * 100) / 100;
            ea.name = [ea['user.last'], ea['user.first']].join(', ').substring(0, 15);
            ea.cmid = isNaN(ea['user.cmid']) ? null : Number(ea['user.cmid']);
            return ea;
          }).sort((a, b) => b.activity - a.activity);

          keenUsers.forEach((u) => {
            cmids.push(u.cmid);
          });

          keenUsers.forEach((u, index) => {
            const i = cmids.indexOf(u.cmid);
            if (i == index) {
              toKeep.push(u);
            }
          });

          keenUsers = toKeep;

          const userIds = users.map(u => u.cmid);

          keenUsers = keenUsers.filter(u => userIds.indexOf(u.cmid) > -1);

          keenUserIds = keenUsers.map(u => u.cmid);

          users = users.filter(u =>
            // only get users that do not exist in the keen response
            // and make sure they are still active
            // TODO: Get rid of nonactive users from even being returned in this at all
             keenUserIds.indexOf(u.cmid) < 0 && users.active).map(u => ({
               activity: 0,
               name: [u.last, u.first].join(', ').substring(0, 15),
               cmid: u.cmid,
             }));

          return keenUsers.concat(users);
        }

        function buildUserActivityChart(users) {
          // Set height based off of remaining users post filter operation
          const height = Math.max(users.length * 30, 100);
          c3.generate({
            data: {
              json: users,
              keys: {
                x: 'name',
                value: ['activity'],
              },
              type: 'bar',
              color(color, d) { return '#6783a1'; },
            },
            axis: {
              rotated: true,
              x: { type: 'category' },
            },
            legend: { show: false },
            size: { width: 720, height },
            bindto: '#userActivity',
          });
        }

        // Get the highest performing weeek
        drawGaugeChart(countsByWeek);

        function drawGaugeChart(weeks) {
          const highestCount = Math.max(...weeks.map(o => Number(o.message_count)));
          let thisWeeksVal = 0;
          if (weeks.length) {
            const latest = weeks[weeks.length - 1];
            const latestDate = new Date(latest.time_period).getWeek();
            const todaysDate = new Date().getWeek();

            if (latestDate == todaysDate || latestDate == todaysDate - 1) {
              thisWeeksVal = Number(latest.message_count);
            }
          }

          const prctgeOfPeak = Math.floor(((thisWeeksVal / highestCount) * 1000)) / 10;

          c3.generate({
            data: {
              columns: [['Proportion of Peak', prctgeOfPeak]],
              type: 'gauge',
            },
            color: {
              pattern: ['#3c5065'], // Color levels for the percentage values
              threshold: { values: [0] },
            },
            size: { height: 140, width: 245 },
            bindto: '#gaugechart',
          });
        }

        // Get the highest performing weeek
        drawTodayVsPeakBarChart(countsByDay);
        function drawTodayVsPeakBarChart(days) {
          const highestCount = Math.max(...days.map(o => Number(o.message_count)));
          let thisDaysVal = 0;
          if (days.length) {
            const latest = days[days.length - 1];
            const todaysDate = moment().format('YYYY-MM-DD');
            if (moment(latest.time_period).add(0, 'day').format('YYYY-MM-DD') == todaysDate ||
                moment(latest.time_period).add(1, 'day').format('YYYY-MM-DD') == todaysDate ||
                moment(latest.time_period).add(2, 'day').format('YYYY-MM-DD') == todaysDate) {
              thisDaysVal = Number(latest.message_count);
            }
          }
          c3.generate({
            data: {
              columns: [
                  ['Today', thisDaysVal],
                  ['Peak', highestCount],
              ],
              type: 'bar',
            },
            axis: {
              x: { show: false },
              y: { show: true },
            },
            color: {
              pattern: ['#3c5065', '#6783a1'],
            },
            size: { height: 175, width: 245 },
            legend: { hide: true },
            bindto: '#todayVsPeakBarChart',
          });
        }
      },
    },

    {
      cssClass: 'JSclientProfile',
      execute() {
        buildPerformanceChart(dailyCounts);

        function buildPerformanceChart(dailyCounts) {
          let keysInbound = dailyCounts.inbound.map(count => count.date);
          const keysOutbound = dailyCounts.outbound.map(count => count.date);
          let valsInbound = dailyCounts.inbound.map(count => Number(count.count));
          const valsOutbound = dailyCounts.outbound.map(count => Number(count.count));

          try {
            const firstDay = new Date(keysOutbound[0]);
            const lastDay = new Date(keysOutbound[keysOutbound.length - 1]);
            const newkeysInbound = _getDatesArray(firstDay, lastDay);
            const newvalsInbound = [];

            newkeysInbound.forEach((day) => {
              const i = keysInbound.indexOf(day);
              if (i > -1) newvalsInbound.push(valsInbound[i]);
              else newvalsInbound.push(0);
            });

            keysInbound = newkeysInbound;
            valsInbound = newvalsInbound;
          } catch (e) { console.log(e); }

          c3.generate({
            data: {
              xs: {
                'Inbound Messages': 'x1',
                'Outbound Messages': 'x2',
              },
              columns: [
                ['x1'].concat(keysInbound),
                ['x2'].concat(keysOutbound),
                ['Inbound Messages'].concat(valsInbound),
                ['Outbound Messages'].concat(valsOutbound),
              ],
              types: { 'Inbound Messages': 'bar', 'Outbound Messages': 'bar' },
              colors: {
                'Inbound Messages': '#4A90E2',
                'Outbound Messages': '#344289',
              },
            },
            legend: { hide: false,
              position: 'inset',
              inset: {
                anchor: 'top-left',
                x: 0,
                y: 0,
                step: undefined,
              },
            },
            axis: { x: { type: 'timeseries', tick: { format: '%m/%d' } } },
            padding: { right: 15, top: 0, bottom: 0 },
            size: { height: 175 },
            grid: { y: { show: true }, x: { show: false } },
            bindto: '#messagingActivity',
          });
        }
      },
    },

    {
      cssClass: 'JSdepartmentSupervisorsManagement',
      execute() {
        $('.scrollListRow').click(function () {
          let selected = 0;
          $('.scrollListRow').each(function () {
            if ($(this).hasClass('selected')) selected += 1;
          });
          const currentlySelected = $(this).hasClass('selected');
          if (selected !== 1 || (selected == 1 && !currentlySelected)) {
            $(this).toggleClass('selected');
          }
        });

        // Before submit, add a hidden field with the selected supervisorId
        $('#updateSupervisors').submit(() => {
          $('.scrollListRow').each(function () {
            if ($(this).hasClass('selected')) {
              const supervisorId = $(this).attr('data-supervisorId');
              $('.scrollListBox').append(`<input type='hidden' name='supervisorIds' value='${supervisorId}'>`);
            }
          });
          return true;
        });
      },
    },

    {
      cssClass: 'JSgroupsEdit',
      execute() {
        $('.scrollListRow').click(function () {
          $(this).toggleClass('selected');
        });

        $('#editGroup').submit(() => {
          $('.scrollListRow').each(function () {
            if ($(this).hasClass('selected')) {
              const clientID = $(this).attr('clientID');
              $('.scrollListBox').append(`<input type='hidden' name='clientIDs' value='${clientID}'>`);
            }
          });
          return true;
        });
      },
    },

    {
      cssClass: 'JSgroupsCreate',
      execute() {
        $('.scrollListRow').click(function () {
          $(this).toggleClass('selected');
        });

        $('#createGroup').submit(() => {
          $('.scrollListRow').each(function () {
            if ($(this).hasClass('selected')) {
              const clientID = $(this).attr('clientID');
              $('.scrollListBox').append(`<input type='hidden' name='clientIDs' value='${clientID}'>`);
            }
          });
          return true;
        });
      },
    },

    {
      cssClass: 'JSgroupsAddress',
      execute() {
        $('.subdued').click(function () {
          $(this).removeClass('subdued');
          $('input[name=subject]').val('');
        });
      },
    },

    {
      cssClass: 'JSnotificationsTemplates',
      execute() {
        $('.scrollListRow').click(function () {
          $('.scrollListRow').removeClass('selected');
          $(this).addClass('selected');
          $('#templateTitle').val(
            $(this).data('title')
          );
          $('#templateContent').val(
            $(this).data('content')
          );
          $('#templateId').val(
            $(this).data('template-id')
          );
        });
      },
    },

    {
      cssClass: 'JSnotificationsEdit',
      execute() {
        $('#clientID').change(function () {
          const v = $(this).val();
          updateClientsAndComms(v);
        });

        function updateClientsAndComms(v) {
          // Remove all existing children in options
          $('#commConn').empty();

          // Now add all client comms associated with that client
          clients.forEach((client) => {
            // Only add if client matches
            if (client.clid == v) {
              client.communications.forEach((comm) => {
                let newOpt = `<option value="${comm.commid}"`;
                if (comm.commid == contactMethod) {
                  newOpt += ' selected ';
                }
                newOpt += `>${comm.name} (${comm.value})` + '</option>';
                $('#commConn').append(newOpt);
              });
              let smartSelect = '<option value="null"';
              if (!contactMethod) {
                smartSelect += ' selected ';
              }
              smartSelect += '>Smart Select (Best Contact Method)</option>';
              $('#commConn').append(smartSelect);
            }
          });
        }

        // Run once since editing the page
        updateClientsAndComms(clientNotification);
      },
    },

    {
      cssClass: 'JSnotificationsCreate',
      execute() {
        // Bind clients to update of comm list
        $('#clientID').change(function () {
          const v = $(this).val();
          updateClientsAndComms(v);
          $('#voiceLink').attr('href', `/clients/${String(v)}/voicemessage`);
        });

        $('#showTextParametersCompose').click(() => {
          $('#initialOptionsButtons').hide();
          $('#textParametersCompose').show();
        });

        function updateClientsAndComms(v) {
          // Remove all existing children in options
          $('#commConn').empty();

          // Now add all client comms associated with that client
          clients.forEach((client) => {
            // Only add if client matches
            if (client.clid == v) {
              client.communications.forEach((comm) => {
                const newOpt = `<option value="${comm.commid}">${
                              comm.name} (${comm.value})` + '</option>';
                $('#commConn').append(newOpt);
              });
              const smartSelect = '<option value="null" ' + '">Smart Select (Best Contact Method)</option>';
              $('#commConn').append(smartSelect);
            }
          });
        }

        if (preSelect) {
          updateClientsAndComms(preSelect);
        }
      },
    },

    {
      cssClass: 'JSclientsCompose',
      execute() {
        $('.subdued').click(function () {
          $(this).removeClass('subdued');
          $('input[name=subject]').val('');
        });
      },
    },

    {
      cssClass: 'JSusersCreate',
      execute() {
        // We check if that email already exists before we allow a submission
        $('#createNewUser').submit((event) => {
          const email = $('input[name=email]').val();
          $.get(`/users/create/check_email/${encodeURIComponent(email)}`)
          .done((res) => {
            if (res.user) {
              alert('That email already is being used. Use a different address.');
              event.preventDefault();
              return false;
            }
            return true;
          }).fail((err) => { console.log(err); });
        });
      },
    },

    {
      cssClass: 'JSuserSettings',
      execute() {
        $('.subdued').click(function () {
          $(this).removeClass('subdued');
          $('input[name=middle]').val('');
        });
      },
    },

  ];

  // Run JS if the class exists on page
  for (var i = 0; i < executors.length; i++) {
    const obj = executors[i];
    try {
      if ($(`.${obj.cssClass}`).length) {
        obj.execute();
      }
    } catch (e) {
      console.log('Error on executing or loading associated JS: ', e);
    }
  }
});
