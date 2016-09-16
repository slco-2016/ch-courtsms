'use strict';

if (process.env.CCENV && process.env.CCENV == "production") {
  console.log("Production env. New Relic running.");
  require("newrelic");
}

// SECRET STUFF
const credentials = require("../credentials");
const SESS_SECRET = credentials.sessionSecret;

// APP INITIATE
const express = require("express");
const app = express();
const db  = require("./db");

// APP DEPENDENCIES
const bodyParser = require('body-parser');
const cookieParser = require("cookie-parser");
const session = require("cookie-session");
const flash = require("connect-flash");
const colors = require("colors");

// CONFIGURATION 1
app.set("view engine", "ejs");
app.set('views', __dirname + '/views');

app.use("/static", express.static("public"));
app.use("/components", express.static("bower_components"));
app.use("/modules", express.static("node_modules"));
app.use(cookieParser());

// PASSPORT SESSIONS, USERS
const bcrypt = require("bcrypt-nodejs");
const passport = require("passport");
require("./passport")(passport);

// CONFIGURATION 2
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());

app.use(flash());
app.use(session({
  keys: [SESS_SECRET],
  name: 'CC_session',
}));

app.use(passport.initialize());
app.use(passport.session());

// Middleware
const middleware = require('./middleware');
app.use(middleware.logging);
app.use(middleware.attachErrorHandlers);
app.use(middleware.templateHelpers);
app.use(middleware.fetchUserAlertsFeed);
app.use(middleware.fetchUserOrganization);
app.use(middleware.fetchUserDepartment);
app.use(middleware.fetchClient);

app.use("/org", middleware.setLevelForOrg);

// UTILITIES
const auth = require('./lib/pass');

// TO DEPRECATE: Always run before routes
require("../routes/request-defaults")(app);

// Twilio-facing routes
// require("../routes/sms")(app);
// require("../routes/voice")(app);

const AccessController = require('./controllers/access');
const ClientsController = require('./controllers/clients');
const ColorsController = require('./controllers/colors');
const DashboardController = require('./controllers/dashboard');
const DepartmentsController = require('./controllers/departments');
const GroupsController = require('./controllers/groups');
const NotificationsController = require('./controllers/notifications');
const RootController = require('./controllers/root');
const TemplatesController = require('./controllers/templates');
const UsersController = require('./controllers/users');

app.get("/", RootController.index);

app.get("/login", AccessController.login);
app.post(/\/(login|login-fail)/, 
  passport.authenticate("local-login", {
    successRedirect: "/",
    failureRedirect: "/login-fail"
  })
);
app.get("/login-fail", AccessController.loginFail);
app.get("/logout", auth.isLoggedIn, AccessController.logout);
app.get("/login/reset", AccessController.reset);
app.post("/login/reset", AccessController.resetSubmit);
app.get("/login/reset/:uid", AccessController.resetSpecific);
app.post("/login/reset/:uid", AccessController.resetSpecficSubmit);

// TO DO: Drop these?
// app.use("/", require("../../routes/user"));
// app.use("/", require("../../routes/org"));

app.get("/colors", ColorsController.index);
app.post("/colors", ColorsController.update);
app.get("/colors/:colorID/remove", ColorsController.destroy);

app.get("/notifications", NotificationsController.index);
app.get("/notifications/create", NotificationsController.new);
app.get("/notifications/create/compose", NotificationsController.compose);
app.post("/notifications/create/compose", NotificationsController.composeCreate);
app.get("/notifications/create/templates", NotificationsController.templates);
app.post("/notifications/create", NotificationsController.create);
app.get("/notifications/:notificationID/edit", NotificationsController.edit);
app.post("/notifications/:notificationID/edit", NotificationsController.update);
app.get("/notifications/:notificationID/remove", NotificationsController.destroy);

app.get("/templates", TemplatesController.index);
app.get("/templates/create", TemplatesController.new);
app.post("/templates/create", TemplatesController.create);
app.get("/templates/remove/:templateID", TemplatesController.destroy);
app.get("/templates/edit/:templateID", TemplatesController.edit);
app.post("/templates/edit/:templateID", TemplatesController.update);

app.get("/groups", GroupsController.index);
app.get("/groups/create", GroupsController.new);
app.post("/groups/create", GroupsController.create);
app.get("/groups/edit/:groupID", GroupsController.edit);
app.post("/groups/edit/:groupID", GroupsController.update);
app.get("/groups/remove/:groupID", GroupsController.destroy);
app.get("/groups/activate/:groupID", GroupsController.activate);
app.get("/groups/address/:groupID", GroupsController.address);
app.post("/groups/address/:groupID", GroupsController.addressUpdate);

app.get("/org", DashboardController.orgIndex);

app.get("/org/users", UsersController.index);
app.get("/org/users/create", UsersController.new);
app.post("/org/users/create", UsersController.create);
app.get("/org/users/create/check/:email", UsersController.check);
app.get("/org/users/:targetUserID/alter/:case", UsersController.alter);
app.get("/org/users/:targetUser/edit", UsersController.edit);
app.post("/org/users/:targetUser/edit", UsersController.update);
app.get("/org/users/:targetUser/transfer", UsersController.transferIndex);
app.post("/org/users/:targetUser/transfer", UsersController.transferUpdate);

app.get("/org/departments", DepartmentsController.index);
app.get("/org/departments/create", DepartmentsController.new);
app.post("/org/departments/create", DepartmentsController.create);
app.get("/org/departments/:departmentId/edit", DepartmentsController.edit);
app.post("/org/departments/:departmentId/edit", DepartmentsController.update);
app.get("/org/departments/:departmentId/supervisors", 
  DepartmentsController.supervisorsIndex);
app.post("/org/departments/:departmentId/supervisors", 
  DepartmentsController.supervisorsUpdate);
app.get("/org/departments/:departmentID/alter/:case", 
  DepartmentsController.alter);

app.get("/org/clients", ClientsController.index);
app.get("/org/clients/create", ClientsController.new);
app.post("/org/clients/create", ClientsController.create);


// Redundant catch all
app.get("/*", (req, res) => {
  res.notFound();
});


module.exports = app;