module.exports = {
  login(req, res) {
    if (req.hasOwnProperty("user")) { 
      res.redirect("/"); 
    } else { 
      res.render("login"); 
    }
  },

  loginFail(req, res) {
    req.flash("warning", "Email password combination did not work.");
    res.render("login");
  },
  
  logout(req, res) {
    req.logout();
    req.flash("success", "Successfully logged out.");
    res.redirect("/")
  },
  
  reset(req, res) {
    res.render("loginreset");
  },
  
  resetSubmit(req, res) {
    var em = req.body.email;

    // See if this email is even in the system
    db("cms")
    .whereRaw("LOWER(email) = LOWER('" + em + "')")
    .limit(1)
    .then((cms) => {

      // This email is not in the system, they need to try again
      if (cms.length == 0) {
        req.flash("warning", "Could not find an account with that email.");
        res.redirect("/login/reset");

      // There is an account with this email in the system
      } else {
        var cm = cms[0];
        var uid = uuid.v1();

        // Remove all prior requests for password reset
        db("pwresets")
        .where("cmid", cm.cmid)
        .del()
        .then(()  =>{ 

        // Create a new row with current pw request
        db("pwresets")
        .insert({
          cmid: cm.cmid,
          uid: uid,
          email: cm.email
        })
        .then(() => {

          emUtil.sendPassResetEmail(cm, uid, () => {
            // Render direction to check email card
            req.flash("success", "Reset password email was sent to " + cm.email );
            res.render("access/loginresetsent", {cm: cm});
          });

        }).catch(res.error500); // Query 3
        }).catch(res.error500); // Query 2

      }

    }).catch(res.error500); // Query 1
  },

  resetSpecific(req, res) {
    // db("pwresets")
    //   .where("uid", req.params.uid)
    //   .andWhere("expiration", ">", db.fn.now())
    //   .limit(1)
    // .then((rows) => {

    //   if (rows.length == 0) { 
    //     req.flash("warning", "That address does not point to a valid password reset link. Try again.");
    //     res.redirect("/login/reset");
    //   } else {
    //     var reset = rows[0];
    //     res.render("access/loginresetphasetwo", {reset: reset});
    //   }

    // }).catch(res.error500);
  },

  resetSpecficSubmit(req, res) {
    var retry_loc = "/login/reset/" + req.params.uid;
    var redirect_loc = "/login/reset/";

    // Critical body elements
    var pwresid = Number(req.body.pwresid);
    var cmid    = Number(req.body.cmid);

    var uid     = String(req.body.uid);
    var uid2    = String(req.params.uid);

    var pass    = String(req.body.pass);
    var pass2   = String(req.body.pass2);


    // Make sure that passwords line up
    if (pass !== pass2) { 
      req.flash("warning", "Passwords do not match, please try again.");
      res.redirect(retry_loc);

    // Make sure key form components line up
    } else if (uid !== uid2) { 
      req.flash("warning", "Bad form entry (uid), please try applying for a new reset key.");
      res.redirect(redirect_loc);

    } else {
      // Make sure that is a valid uid being provided
      db("pwresets")
        .where("uid", uid)
        .andWhere("cmid", cmid)
        .andWhere("pwresid", pwresid)
        .andWhere("expiration", ">", db.fn.now())
        .limit(1)
        .returning("email")
      .then((rows) => {

        // Form entry is bad, they did include correct hidden components
        if (rows.length == 0) { 
          req.flash("warning", "Bad form entry, please try applying for a new reset key.");
          res.redirect(redirect_loc);

        // Found the relevant row
        } else {

          // Query 2: Update the case manager's password
          db("cms")
          .where("cmid", cmid)
          .update({pass: hashPw(pass)})
          .then((rows) => {
            
          // Query 3: We can delete that pw reset row now
          db("pwresets")
          .where("pwresid", pwresid)
          .del()
          .then(() => {

            // Prompt the case manager to log in with new pw
            req.flash("success", "You have updated your account password.");
            res.redirect("/login");

          }).catch(res.error500); // Query 3
          }).catch(res.error500); // Query 2

        }
      }).catch(res.error500);
    }
  }

};
