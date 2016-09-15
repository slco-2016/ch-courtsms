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
app.use(middleware.attachErrorHandlers)
app.use(middleware.templateHelpers);
app.use(middleware.fetchUserAlertsFeed);
app.use(middleware.fetchUserOrganization);
app.use(middleware.fetchUserDepartment);
app.use("/org", middleware.setLevelForOrg);

// UTILITIES
const auth = require('./lib/pass')

// ALL ROUTES
// Always run before routes

require("../routes/request-defaults")(app);

// Login and session management
require("../routes/access")(app, passport);

// CM-Subroutes here
// TO DO: Discuss if these should be rolled in under cmview itself
// Capture view
var captureRoutes = require("../../routes/cm-subroutes/capture");
app.use("/capture", auth.isLoggedIn, captureRoutes);

// Twilio-facing routes
require("../../routes/sms")(app);
require("../../routes/voice")(app);

const rootController = require('./controllers/root');
const clientsController = require('./controllers/clients');
const departmentsController = require('./controllers/departments');
const accessController = require('./controllers/access');
const usersController = require('./controllers/users');
const dashboardController = require('./controllers/dashboard');

app.get("/", rootController.index);

app.get("/login", accessController.login);
app.post(/\/(login|login-fail)/, 
  passport.authenticate("local-login", {
    successRedirect: "/",
    failureRedirect: "/login-fail"
  })
);
app.get("/login-fail", accessController.loginFail);
app.get("/logout", auth.isLoggedIn, accessController.logout);
app.get("/login/reset", accessController.reset);
app.post("/login/reset", accessController.resetSubmit);
app.get("/login/reset/:uid", accessController.resetSpecfic);
app.post("/login/reset/:uid", accessController.resetSpecficSubmit);

app.use("/", require("../../routes/user"));
app.use("/", require("../../routes/org"));

app.get("/org/clients", dashboardController.orgIndex);

app.get("/org/users", usersController.index);
app.get("/org/users/create", usersController.new);
app.post("/org/users/create", usersController.create);
app.get("/org/users/create/check/:email", usersController.check);
app.get("/org/users/:targetUserID/alter/:case", usersController.alter);
app.get("/org/users/:targetUser/edit", usersController.edit);
app.post("/org/users/:targetUser/edit", usersController.update);
app.get("/org/users/:targetUser/transfer", usersController.transferIndex);
app.post("/org/users/:targetUser/transfer", usersController.transferUpdate);

app.get("/org/departments", departmentsController.index);
app.get("/org/departments/create", departmentsController.new);
app.post("/org/departments/create", departmentsController.create);
app.get("/org/departments/:departmentId/edit", departmentsController.edit);
app.post("/org/departments/:departmentId/edit", departmentsController.update);
app.get(
  "/org/departments/:departmentId/supervisors", 
  departmentsController.supervisorsIndex);
app.post(
  "/org/departments/:departmentId/supervisors", 
  departmentsController.supervisorsUpdate);
app.get(
  "/org/departments/:departmentID/alter/:case", 
  departmentsController.alter);

// Redundant catch all
app.get("/*", (req, res) => {
  notFound(res);
});


module.exports = app;