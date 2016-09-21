
$(function() {
  var executors = [{
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
  }];

  for(var i=0;i<executors.length;i++){
    let obj = executors[i];
    if ($("." + obj.cssClass).length) {
      obj.execute();
    };
  };

})