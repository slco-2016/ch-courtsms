
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
      execute: function() {
        function toggleTypeBox () {
          $("#typeBox").toggle();
          $(".full").toggle();
          if ($("#typeBox").is(":visible")) {
            $(".messageStream").css("margin-bottom", 60);
          } else { 
            $(".messageStream").css("margin-bottom", 150);
            scrollLast()
          }
        }

        function adjustDivs () {
          $(".leftBar").height($(window).height() - 92);
          $(".rightContent").height($(window).height() - 92);
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
          if (ok) {
            $(".submit").removeClass("disabled");
          } else {
            $(".submit").addClass("disabled");
          }
          return ok;
        }

        $(window).resize(adjustDivs)

        $("#typeBox").click(toggleTypeBox);
        $("#closeTypeBox").click(toggleTypeBox);

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
              event.preventDefault();
              return false;
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
                buildUserActivityChart(res.result); 
                $("#userActivity").parent().find(".loading").hide();
              }
            });
          });
        });

        function adjustDivs () {
          $(".leftBar").height($(window).height() - 92);
          $(".rightContent").height($(window).height() - 92);
        };

        // Utility to facilitate adding of days
        Date.prototype.addDays = function (days) {
          var dat = new Date(this.valueOf())
          dat.setDate(dat.getDate() + days);
          return dat;
        }

        function getDatesArray (startDate, stopDate) {
          var dateArray = new Array();
          var currentDate = startDate;
          while (currentDate <= stopDate) {
              dateArray.push(moment(new Date(currentDate)).format("YYYY-MM-DD"));
              currentDate = currentDate.addDays(1);
          }
          return dateArray;
        }

        buildPerformanceChart(countsByWeek, countsByDay);

        function buildPerformanceChart (countsByWeek, countsByDay) {
          var keysWeek = countsByWeek.map( function (count) { return count.time_period; });
          var keysDay  = countsByDay.map(  function (count) { return count.time_period; });
          var valsWeek = countsByWeek.map( function (count) { return Number(count.message_count); });
          var valsDay  = countsByDay.map(  function (count) { return Number(count.message_count); });

          var firstDay = new Date(keysDay[0]);
          var lastDay = new Date(keysDay[keysDay.length - 1]);
          var newKeysDay = getDatesArray(firstDay, lastDay);
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
              types: {"Weekly Activity": "area", "Daily Activity": "area"},
              colors: {
                  "Weekly Activity": "#FFC966",
                  "Daily Activity": "#FF6700"
              }
            },
            legend: { hide: true },
            axis: { x: { type: "timeseries", tick: { format: "%m/%d" } } },
            padding: { right: 0, top: 20, bottom: 0 },
            size: { width: 720, height: 230 },
            grid: { y: { show: false }, x: { show: false } },
            bindto: "#overallGraph"
          });
        };

        function buildUserActivityChart(users) {
          users = users.filter(function (ea) {
            if (departmentFilter) {
              if (userFilter) {
                return userFilter === Number(ea["user.cmid"]);
              } else {
                return departmentFilter == Number(ea["user.department"]);
              }
            } else if (userFilter) {
              return userFilter === Number(ea["user.cmid"]);
            } else {
              return true;
            }
          }).map(function (ea) {
            ea["User Activity"] = Math.ceil((ea.result/(1000*60*60))*100)/100; 
            ea.name = [ea["user.last"], ea["user.first"]].join(", ").substring(0, 15);
            return ea;
          });
          
          // Set height based off of remaining users post filter operation
          var height = Math.max(users.length * 20, 100);
          c3.generate({
            data: {
              json: users,
              keys: {
                x: "name",
                value: ["User Activity"]
              },
              type: "bar",
              color: function (color, d) { return "#3F69B6"; }
            },
            axis: {
              rotated: true,
              x: { type: "category" }
            },
            size: { width: 720, height: height },
            bindto: "#userActivity"
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
                var newOpt = '<option value="' + comm.commid + '">' + 
                              comm.name + " (" + comm.value + ")" + '</option>';
                $("#commConn").append(newOpt);
              });
              var smartSelect = '<option value="null" ' + '">Smart Select</option>';
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
                var newOpt = '<option value="' + comm.commid + '">' + 
                              comm.name + " (" + comm.value + ")" + '</option>';
                $("#commConn").append(newOpt);
              });
              var smartSelect = '<option value="null" ' + '">Smart Select</option>';
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