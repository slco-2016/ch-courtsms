/**
 * Returns the week number for this date.  dowOffset is the day of week the week
 * "starts" on for your locale - it can be from 0 to 6. If dowOffset is 1 (Monday),
 * the week returned is the ISO 8601 week number.
 * @param int dowOffset
 * @return int
 */
Date.prototype.getWeek = function (dowOffset) {
/*getWeek() was developed by Nick Baicoianu at MeanFreePath: http://www.meanfreepath.com */

    dowOffset = typeof(dowOffset) == 'int' ? dowOffset : 0; //default dowOffset to zero
    var newYear = new Date(this.getFullYear(),0,1);
    var day = newYear.getDay() - dowOffset; //the day of week the year begins on
    day = (day >= 0 ? day : day + 7);
    var daynum = Math.floor((this.getTime() - newYear.getTime() - 
    (this.getTimezoneOffset()-newYear.getTimezoneOffset())*60000)/86400000) + 1;
    var weeknum;
    //if the year starts before the middle of a week
    if(day < 4) {
        weeknum = Math.floor((daynum+day-1)/7) + 1;
        if(weeknum > 52) {
            nYear = new Date(this.getFullYear() + 1,0,1);
            nday = nYear.getDay() - dowOffset;
            nday = nday >= 0 ? nday : nday + 7;
            /*if the next year starts before the middle of
              the week, it is week #1 of that year*/
            weeknum = nday < 4 ? 1 : 53;
        }
    }
    else {
        weeknum = Math.floor((daynum+day-1)/7);
    }
    return weeknum;
};

function _getDatesArray (startDate, stopDate) {
  var dateArray = new Array();
  var currentDate = moment(startDate).add(-1, 'day');
  stopDate = moment(stopDate).add(1, 'day');
  while (currentDate <= stopDate) {
      dateArray.push(moment(new Date(currentDate)).format("YYYY-MM-DD"));
      currentDate = currentDate.add(1, "days");
  }
  return dateArray;
}

$(function() {
  var executors = [
    {
    cssClass: 'JStransferClient',
      execute: function() {
        var substringMatcher = function (strs) {
          return function findMatches(q, cb) {
            var matches = [];
            var substrRegex = new RegExp(q, 'i');
            $.each(strs, function(i, str) {
              var name = str.first + " " + str.last;
              if (str.department_name) {
                name += " (" + str.department_name + ")";
              }
              if (substrRegex.test(name)) matches.push(name);
            });

            cb(matches);
          };
        };

        $(".formInput .typeahead")
        .typeahead({
            hint: true,
            highlight: true,
            minLength: 1
          },
          {
            name: "users",
            value: "cmid",
            source: substringMatcher(users),
            select: function (e, i) { console.log( e, i )}
        });

        $("#userSearch").submit(function (event) {
          var selectedName = $(".tt-input").val();
          var selectedUser = null;
          users.forEach(function (u) {
            var name = u.first + " " + u.last;
            if (u.department_name) {
              name += " (" + u.department_name + ")";
            }
            if (name == selectedName) selectedUser = u;
          });
          if (selectedUser) {
            $("#targetUser").val(selectedUser.cmid)
            return true;
          } else {
            event.preventDefault();
            return false;
          }
        })
      }
    },

    {
      cssClass: 'JSfindClient',
      execute: function() {
        var substringMatcher = function (strs) {
          return function findMatches(q, cb) {
            var matches = [];
            var substrRegex = new RegExp(q, 'i');
            $.each(strs, function(i, str) {
              var name = str.first + " " + str.last;
              if (substrRegex.test(name)) matches.push(name);
            });

            cb(matches);
          };
        };

        $(".formInput .typeahead")
        .typeahead({
            hint: true,
            highlight: true,
            minLength: 1
          },
          {
            name: "clients",
            value: "clid",
            source: substringMatcher(clients),
            select: function (e, i) { console.log( e, i )}
        });

        $("#clientSearch").submit(function (event) {
          var selectedName = $(".tt-input").val();
          var selectedClient = null;
          clients.forEach(function (client) {
            var name = client.first + " " + client.last;
            if (name == selectedName) selectedClient = client;
          });
          if (selectedClient) {
            $("#targetClient").val(selectedClient.clid)
            return true;
          } else {
            event.preventDefault();
            return false;
          }
        })
      }
    },

    {
      cssClass: 'JSselectTemplateWhenAddressingClient',
      execute: function() {
        $(".scrollListRow").click(function () {
          $(".scrollListRow").removeClass("selected");
          $(this).addClass("selected");
          $('#templateTitle').val(
            $(this).data('title')
          )
          $('#templateContent').val(
            $(this).data('content')
          )
        });
      }
    },

    {
      cssClass: 'JSmessagesStream',
      execute: function(directive) {
        function toggleSubjectView (directive) {
          // first, update the subject toggle setting
          if (directive == "off") {
            $("#subjectView-on").removeClass("selected");
            $("#subjectView-off").addClass("selected");
          } else {
            $("#subjectView-on").addClass("selected");
            $("#subjectView-off").removeClass("selected");
          }

          // next, show or hide the side convo bar
          if (directive == "off") {
            $(".leftBar").hide();
            $(".rightContent").width(1024)
            $(".messageDiv.rightAligned").css("padding-left", "255px");
          } else {
            $(".leftBar").show();
            $(".rightContent").width(768)
            $(".messageDiv.rightAligned").css("padding-left", "0px")
          }
        }

        // bind actions to toggle control for side convos view
        $("#subjectView-on").click(function() {
          toggleSubjectView("on");
        })
        $("#subjectView-off").click(function() {
          toggleSubjectView("off");
        })

        function toggleTypeBox (hide) {
          if (hide == "close") {
            // $(".full").hide();
            // $("textarea[name='content']").hide();
            // $(".name").hide();
            // // $(".actionButton").css("margin-top", "20px");
            // $("#placeHolderTypeBox").show();
            // $(".messageStream").css("margin-bottom", 150);
          } else {
            $(".full").show();
            $("#actualTypeBox").show();
            $(".name").show();
            $(".actionButton").css("margin-top", "20px");
            $("#placeHolderTypeBox").hide();
            $(".messageStream").css("margin-bottom", 150);
            scrollLast()
          }
        };
        // toggleTypeBox()

        function adjustDivs () {
          $(".leftBar").height($(window).height() - 97);
          $(".rightContent").height($(window).height() - 97);
        }

        function scrollLast () {
          $("#lastMessage")[0].scrollIntoView({ 
            block: "end", 
            behavior: "smooth"
          });
        }

        function checkSubmitValid () {
          var ok = true;
          if ($("select[name=commID]").val() == null) ok = false;
          if ($("textarea[name=content]").val().length == 0) ok = false;
          // if (ok) {
          //   $(".submit").removeClass("disabled");
          // } else {
          //   $(".submit").addClass("disabled");
          // }
          return ok;
        }

        $(window).resize(adjustDivs)

        // $(".rightContent").scroll(function() {
        //   if ($(".rightContent").scrollTop() >= 50) {
        //   toggleTypeBox("close")
        //   }
        // });
        $("#placeHolderTypeBox").click(toggleTypeBox);

        $("textarea[name=content]").keyup(checkSubmitValid);
        $("select[name=commID]").change(checkSubmitValid);

        $(".submit").click(function () {
          if (checkSubmitValid()) {
            $("#newMessage").submit();
          }
        });

        // On load actions
        $(window).ready(function () {
          try { adjustDivs(); scrollLast(); } catch (e) { console.log(e); }
        });
      }
    },

    {
      cssClass: 'JSclientIndex',
      execute: function() {
        var originalBackgroundColor = null;
        $(".clientRow")
          .hover(
            function () {
              var color = $(this).attr("data-client-color");
              originalBackgroundColor = $(this).css("background-color");
              $(this).css("background-color", color);
            }, function () {
              $(this).css("background-color", originalBackgroundColor);
            }
          );
      }
    },

    {
      cssClass: 'JScreateClient',
      execute: function () {
        $(".subdued").click(function () {
          $(this).removeClass("subdued");
          $("input[name=subject]").val("");
        });

        // All code below is also in tranfer.ejs, so we need to have this not be copied...
        // global
        if (users) {
          var substringMatcher = function (strs) {
            return function findMatches(q, cb) {
              var matches = [];
              var substrRegex = new RegExp(q, 'i');
              $.each(strs, function(i, s) {
                var name = `${s.first} ${s.last}`;
                if (substrRegex.test(name)) matches.push(name);
              });

              cb(matches);
            };
          };

          $(".formInput .typeahead")
          .typeahead({
              hint: true,
              highlight: true,
              minLength: 1
            },
            {
              name: "users",
              value: "cmid",
              source: substringMatcher(users),
              select: function (e, i) { console.log( e, i )}
          });

          $("#createForm").submit(function (event) {
            var selectedName = $(".tt-input").val();
            var selectedUser = null;
            users.forEach(function (u) {
              var name = `${u.first} ${u.last}`;
              if (name == selectedName) selectedUser = u;
            });
            if (selectedUser) {
              $("#targetUser").val(selectedUser.cmid)
              return true;
            } else {
              return true;
            }
          });
        }
      }
    },

    {
      cssClass: 'JSclientSelectColor',
      execute: function () {
        console.log("running");

        $(".colorList").click(function () {
          var colorTag = $(this).find(".colorTag");
          var colorID = colorTag.attr("data-colorID");
          var colorTagColor = colorTag.css("background-color");
          var colorTagName = colorTag.attr("data-colorTagName");

          // update selected value
          $("#chosenColorID").val(colorID);

          // update color and name on the block
          $(".clientNameBox").css("background-color", colorTagColor);
          $(".clientColorNameSelected").text(colorTagName)
        });
      }
    },

    {
      cssClass: 'JSclientAddress',
      execute: function () {
        $(".subdued").click(function () {
          $(this).removeClass("subdued");
          $("input[name=subject]").val("");
        });
      }
    },

    {
      cssClass: 'JScolorsManager',
      execute: function () {
        $(".colorTagAdd").click(function () {
          if ($(".colorTagName").val() !== "") {
            var i = document.createElement("input");
            i.type = "hidden";
            i.name = "color";
            i.value = $(".jscolor").css("background-color");
            document.getElementById("addNewColorTagForm").appendChild(i);
            $("#addNewColorTagForm").submit();
          }
        });
      }
    },

    {
      cssClass: 'JSdashboard',
      execute: function () {
        try { adjustDivs(); } catch (e) { console.log(e); }
        $(window).resize(adjustDivs);
        $(document).ready(function () {
          var keenQueryClient = new Keen({
            projectId: "5750a91433e4063ccd5b6c7e",
            readKey: "a70db21e3f6527c10ee23f2697714bf883783b6018b8f3fd27d94bf0b0d9eb9cb26a22d69709dff266866c526ad0e9e845c82dd5393b417d99c2ef7712d979a960e9247806dc09231e9ff7880ab2772cfa1b41d9900de385db8d5942d4d337bd"
          });
          Keen.ready(function () {
            var keenQuery = new Keen.Query("sum", {
              eventCollection: "pagedurations",
              groupBy: [ "user.first", "user.last", "user.department", "user.cmid" ],
              targetProperty: "duration",
              timeframe: "this_2_days",
              timezone: "UTC"
            });
            keenQueryClient.run(keenQuery, function (err, res){
              if (!err) {
                var keenUsers = getRelevantKeenUsers(users, res.result);
                buildUserActivityChart(keenUsers); 
                $("#userActivity").parent().find(".loading").hide();

                var activeKeenUsers = keenUsers.filter(function(u) {
                  return u.activity > 0;
                });
                var staffCt = users.length;
                var activeStaffPercentage;
                if (staffCt) {
                  activeStaffPercentage = Math.round(activeKeenUsers.length/staffCt * 100);
                } else {
                  activeStaffPercentage = 0;
                }

                $("#activeStaffPercentage").html(activeStaffPercentage + "<small>%</small>");
              }
            });
          });
        });

        function adjustDivs () {
          $(".leftBar").height($(window).height() - 97);
          $(".rightContent").height($(window).height() - 97);
        };

        $("#seeUsers").click(usersShowToggle)
        function usersShowToggle () {
          $(".userTab").toggle();
          $("#seeUsers").toggleClass("selected");
        };
        if (departmentFilter || userFilter) {
          usersShowToggle();
        }

        // Utility to facilitate adding of days
        Date.prototype.addDays = function (days) {
          var dat = new Date(this.valueOf())
          dat.setDate(dat.getDate() + days);
          return dat;
        }

        var usersSortedByMessagingVolume = users.sort(function(a, b) {
          return b["week_count"] - a["week_count"];
        });
        var topAndBottomThreshold = usersSortedByMessagingVolume.length/2;
        // let everyone be in the top if less than 5 in department
        if (topAndBottomThreshold < 5) topAndBottomThreshold = 1000000;
        for (var i = 0; i < 5; i++) {
          var top = usersSortedByMessagingVolume[i];
          var oneMore = i + 1;
          var bottom = usersSortedByMessagingVolume[usersSortedByMessagingVolume.length - oneMore];
          if (top) {
            var topname = top.first + " " + top.last;
            if (i >= topAndBottomThreshold) topname = "-";
            $("#topUser-" + oneMore).html(topname);
          }
          if (bottom) {
            var bottomname = bottom.first + " " + bottom.last;
            if (usersSortedByMessagingVolume.length - oneMore <= topAndBottomThreshold) bottomname = "-";
            $("#bottomUser-" + oneMore).html(bottomname);
          }
        }

        buildPerformanceChart(countsByWeek, countsByDay);

        function buildPerformanceChart (countsByWeek, countsByDay) {
          var keysWeek = countsByWeek.map( function (count) { return count.time_period; });
          var keysDay  = countsByDay.map(  function (count) { return count.time_period; });
          var valsWeek = countsByWeek.map( function (count) { return Number(count.message_count); });
          var valsDay  = countsByDay.map(  function (count) { return Number(count.message_count); });

          var firstDay = new Date(keysDay[0]);
          var lastDay = new Date(keysDay[keysDay.length - 1]);
          
          var newKeysDay = _getDatesArray(firstDay, lastDay);
          var newValsDay = [];
          newKeysDay.forEach(function (day) {
            var i = keysDay.indexOf(day);
            if (i > -1) newValsDay.push(valsDay[i]);
            else newValsDay.push(0);
          });

          c3.generate({
            data: {
              xs:{
                  "Weekly Activity": "x1",
                  "Daily Activity":  "x2"
              },
              columns: [
                  ["x1"].concat(keysWeek),
                  ["x2"].concat(newKeysDay),
                  ["Weekly Activity"].concat(valsWeek),
                  ["Daily Activity"].concat(newValsDay)
              ],
              types: {"Weekly Activity": "area-spline", "Daily Activity": "area-spline"},
              colors: {
                  "Weekly Activity": "#6783a1",
                  "Daily Activity": "#3c5065"
              }
            },
            point: {show: false},
            legend: { hide: true },
            axis: { x: { type: "timeseries", tick: { format: "%m/%d" } } },
            padding: { right: 0, top: 0, left: 35, bottom: 25 },
            size: { width: 750, height: 230 },
            grid: { y: { show: false }, x: { show: false } },
            bindto: "#overallGraph"
          });

          // donut percent closed clients chart
          var donutPercent = Math.floor(10000*surveySynopsis.closeout.success/(surveySynopsis.closeout.failure + surveySynopsis.closeout.success))/100;
          c3.generate({
            data: {
              columns: [
                ['Unsuccessful', surveySynopsis.closeout.failure],
                ['Successful',   surveySynopsis.closeout.success],
              ],
              type : 'donut',            },
            color: {
              pattern: ['#e0e0e0', '#3c5065']
            },
            donut: {
              title: donutPercent + "%",
              label: {format: function (value) { return ''; }},

            },
            legend: { show: false },
            size: { width: 150, height: 150 },
            bindto: "#clientSuccessChart"
          });
        };

        function getRelevantKeenUsers (users, keenUsers) {
          keenUsers = keenUsers.filter(function (ea) {
            if (departmentFilter) {
              if (userFilter) {
                return userFilter === Number(ea["user.cmid"]);
              } else {
                return departmentFilter == Number(ea["user.department"]);
              }
            } else if (userFilter) {
              return userFilter === Number(ea["user.cmid"]);
            } else {
              return ea["user.first"] && ea["user.last"];
            }
          }).map(function (ea) {
            ea["activity"] = Math.ceil((ea.result/(1000*60*60))*100)/100; 
            ea.name = [ea["user.last"], ea["user.first"]].join(", ").substring(0, 15);
            ea.cmid = isNaN(ea["user.cmid"]) ? null : Number(ea["user.cmid"]);
            return ea;
          }).sort(function(a, b) {
            return b["activity"] - a["activity"];
          });

          keenUserIds = keenUsers.map(function(u) {
            return u.cmid;
          });
          users = users.filter(function (u) {
            return keenUserIds.indexOf(u.cmid) < 0;
          }).map(function (u) {
            return {
              activity: 0,
              name: [u["last"], u["first"]].join(", ").substring(0, 15),
              cmid: u.cmid
            }
          });
          return keenUsers.concat(users);
        }

        function buildUserActivityChart(users) {          
          // Set height based off of remaining users post filter operation
          var height = Math.max(users.length * 30, 100);
          c3.generate({
            data: {
              json: users,
              keys: {
                x: "name",
                value: ["activity"]
              },
              type: "bar",
              color: function (color, d) { return "#6783a1"; }
            },
            axis: {
              rotated: true,
              x: { type: "category" },
              y: {
                font: { size: '33px', },
                label: {
                  size: '33px',
                }
              },
            },
            legend: { show: false },
            size: { width: 720, height: height },
            bindto: "#userActivity"
          });
        };

        // Get the highest performing weeek
        drawGaugeChart(countsByWeek);

        function drawGaugeChart (weeks) {
          var highestCount = Math.max.apply(Math,weeks.map(function(o){return Number(o.message_count);}))
          var thisWeeksVal = 0;
          if (weeks.length) {
            var latest = weeks[weeks.length - 1];
            var latestDate = new Date(latest.time_period).getWeek();
            var todaysDate = new Date().getWeek();

            if (latestDate == todaysDate || latestDate == todaysDate - 1) {
              thisWeeksVal = Number(latest.message_count);
            }
          }

          var prctgeOfPeak = Math.floor(((thisWeeksVal/highestCount)*1000))/10

          c3.generate({
              data: {
                columns: [ ["Proportion of Peak", prctgeOfPeak] ],
                type: "gauge",
              },
              color: {
                pattern: ["#3c5065"], // Color levels for the percentage values
                threshold: { values: [0] }
              },
              size: { height: 140, width: 245 },
              bindto: "#gaugechart"
          });
        };

        // Get the highest performing weeek
        drawTodayVsPeakBarChart(countsByDay);
        function drawTodayVsPeakBarChart (days) {
          var highestCount = Math.max.apply(Math,days.map(function(o){return Number(o.message_count);}))
          var thisDaysVal = 0;
          if (days.length) {
            var latest = days[days.length - 1];
            var todaysDate = moment().format("YYYY-MM-DD");
            if (moment(latest.time_period).add(0, 'day').format("YYYY-MM-DD") == todaysDate ||
                moment(latest.time_period).add(1, 'day').format("YYYY-MM-DD") == todaysDate ||
                moment(latest.time_period).add(2, 'day').format("YYYY-MM-DD") == todaysDate) {
              thisDaysVal = Number(latest.message_count);
            }
          }
          c3.generate({
              data: {
                columns: [
                  ["Today", thisDaysVal],
                  ["Peak",  highestCount]
                ],
                type: "bar",
              },
              axis: {
                x: {show:false},
                y: {show:true}
              },
              color: {
                pattern: ['#3c5065', '#6783a1']
              },
              size: { height: 175, width: 245 },
              legend: { hide: true },
              bindto: "#todayVsPeakBarChart"
          });
        };

      }
    },

    {
      cssClass: 'JSclientProfile',
      execute: function () {
        buildPerformanceChart(dailyCounts);

        function buildPerformanceChart (dailyCounts) {
          var keysInbound   = dailyCounts.inbound.map( function (count) { return count.date; });
          var keysOutbound  = dailyCounts.outbound.map(function (count) { return count.date; });
          var valsInbound   = dailyCounts.inbound.map( function (count) { return Number(count.count); });
          var valsOutbound  = dailyCounts.outbound.map(function (count) { return Number(count.count); });

          try {
            var firstDay = new Date(keysOutbound[0]);
            var lastDay = new Date(keysOutbound[keysOutbound.length - 1]);
            var newkeysInbound = _getDatesArray(firstDay, lastDay);
            var newvalsInbound = [];

            newkeysInbound.forEach(function (day) {
              var i = keysInbound.indexOf(day);
              if (i > -1) newvalsInbound.push(valsInbound[i]);
              else newvalsInbound.push(0);
            });

            keysInbound = newkeysInbound;
            valsInbound = newvalsInbound;
          } catch (e) { console.log(e); }

          c3.generate({
            data: {
              xs:{
                  "Inbound Messages": "x1",
                  "Outbound Messages":  "x2"
              },
              columns: [
                  ["x1"].concat(keysInbound),
                  ["x2"].concat(keysOutbound),
                  ["Inbound Messages"].concat(valsInbound),
                  ["Outbound Messages"].concat(valsOutbound)
              ],
              types: {"Inbound Messages": "bar", "Outbound Messages": "bar"},
              colors: {
                  "Inbound Messages": "#4A90E2",
                  "Outbound Messages": "#344289"
              }
            },
            legend: { hide: false, position: 'inset', inset: {
                anchor: 'top-left',
                x: 0,
                y: 0,
                step: undefined
              }
            },
            axis: { x: { type: "timeseries", tick: { format: "%m/%d" } } },
            padding: { right: 15, top: 0, bottom: 0 },
            size: { height: 175 },
            grid: { y: { show: true }, x: { show: false } },
            bindto: "#messagingActivity"
          });
        };
      }
    },

    {
      cssClass: 'JSdepartmentSupervisorsManagement',
      execute: function () {
        $(".scrollListRow").click(function () {
          var selected = 0;
          $(".scrollListRow").each(function () {
            if ($(this).hasClass("selected")) selected += 1;
          });
          var currentlySelected = $(this).hasClass("selected");
          if (selected !== 1 || (selected == 1 && !currentlySelected)) {
            $(this).toggleClass("selected");
          }
        });

        // Before submit, add a hidden field with the selected supervisorId
        $("#updateSupervisors").submit(function () {
          $(".scrollListRow").each(function () {
            if ($(this).hasClass("selected")) {
              var supervisorId = $(this).attr("data-supervisorId");
              $(".scrollListBox").append("<input type='hidden' name='supervisorIds' value='" + supervisorId + "'>");
            }
          });
          return true;
        });
      }
    },

    {
      cssClass: 'JSgroupsEdit',
      execute: function () {
        $(".scrollListRow").click(function () {
          $(this).toggleClass("selected");
        });

        $("#editGroup").submit(function () {
          $(".scrollListRow").each(function () {
            if ($(this).hasClass("selected")) {
              var clientID = $(this).attr("clientID");
              $(".scrollListBox").append("<input type='hidden' name='clientIDs' value='" + clientID + "'>");
            }
          });
          return true;
        });
      }
    },

    {
      cssClass: 'JSgroupsCreate',
      execute: function () {
        $(".scrollListRow").click(function () {
          $(this).toggleClass("selected");
        });

        $("#createGroup").submit(function () {
          $(".scrollListRow").each(function () {
            if ($(this).hasClass("selected")) {
              var clientID = $(this).attr("clientID");
              $(".scrollListBox").append("<input type='hidden' name='clientIDs' value='" + clientID + "'>")
            }
          });
          return true;
        });
      }
    },

    {
      cssClass: 'JSgroupsAddress',
      execute: function () {
        $(".subdued").click(function () {
          $(this).removeClass("subdued");
          $("input[name=subject]").val("");
        });
      }
    },

    {
      cssClass: 'JSnotificationsTemplates',
      execute: function () {
        $(".scrollListRow").click(function () {
          $(".scrollListRow").removeClass("selected");
          $(this).addClass("selected");
          $('#templateTitle').val(
            $(this).data('title')
          )
          $('#templateContent').val(
            $(this).data('content')
          )
        });
      }
    },

    {
      cssClass: 'JSnotificationsEdit',
      execute: function () {
        $("#clientID").change(function () {
          var v = $(this).val();
          updateClientsAndComms(v)
        });

        function updateClientsAndComms (v) {
          // Remove all existing children in options
          $("#commConn").empty();

          // Now add all client comms associated with that client
          clients.forEach(function (client) {
            // Only add if client matches
            if (client.clid == v) {
            client.communications.forEach(function (comm) {
              var newOpt = '<option value="' + comm.commid + '"';
              if (comm.commid == contactMethod) {
                newOpt += ' selected ';
              }
              newOpt += '>' + comm.name + " (" + comm.value + ")" + '</option>';
              $("#commConn").append(newOpt);
            });
            var smartSelect = '<option value="null"';
            if (!contactMethod) {
              smartSelect += ' selected ';
            }
            smartSelect += '>Smart Select (Best Contact Method)</option>';
            $("#commConn").append(smartSelect);
            }
          });
        };

        // Run once since editing the page
        updateClientsAndComms(clientNotification);
      }
    },

    {
      cssClass: 'JSnotificationsCreate',
      execute: function () {
        // Bind clients to update of comm list
        $("#clientID").change(function () {
          var v = $(this).val();
          updateClientsAndComms(v);
          $("#voiceLink").attr("href", "/clients/" + String(v) + "/voicemessage");
        });

        $("#showTextParametersCompose").click(function () {
          $("#initialOptionsButtons").hide();
          $("#textParametersCompose").show();
        });

        function updateClientsAndComms (v) {
          // Remove all existing children in options
          $("#commConn").empty();

          // Now add all client comms associated with that client
          clients.forEach(function (client) {
            // Only add if client matches
            if (client.clid == v) {
              client.communications.forEach(function (comm) {
                var newOpt = '<option value="' + comm.commid + '">' + 
                              comm.name + " (" + comm.value + ")" + '</option>';
                $("#commConn").append(newOpt);
              });
              var smartSelect = '<option value="null" ' + '">Smart Select (Best Contact Method)</option>';
              $("#commConn").append(smartSelect);
            }
          });
        };

        if (preSelect) {
          updateClientsAndComms(preSelect);
        }
      }
    },

    {
      cssClass: 'JSclientsCompose',
      execute: function () {
        $(".subdued").click(function () {
          $(this).removeClass("subdued");
          $("input[name=subject]").val("");
        });
      }
    },

    {
      cssClass: 'JSusersCreate',
      execute: function () {
        // We check if that email already exists before we allow a submission
        $("#createNewUser").submit(function (event) {
          var email = $("input[name=email]").val();
          $.get("/users/create/check_email/" + encodeURIComponent(email))
          .done(function (res) {
            if (res.user) {
              alert("That email already is being used. Use a different address.");
              event.preventDefault();
              return false;
            } else {
              return true;
            }
          }).fail(function (err) { console.log(err); });
        });
      }
    },

    {
      cssClass: 'JSuserSettings',
      execute: function () {
        $(".subdued").click(function () {
          $(this).removeClass("subdued");
          $("input[name=middle]").val("");
        });
      }
    }

  ];

  // Run JS if the class exists on page
  for(var i=0;i<executors.length;i++){
    let obj = executors[i];
    try {
      if ($("." + obj.cssClass).length) {
        obj.execute();
      };
    } catch(e) {
      console.log("Error on executing or loading associated JS: ", e);
    }
  };

});