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
const auth = require('./lib/pass');

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
// These need specific routes to run correctly
// TODO: Why are there 4 db queries every time?
app.use(middleware.attachErrorHandlers);
app.use(middleware.fetchUserAlertsFeed);
app.use(middleware.fetchUserOrganization);
app.use(middleware.fetchUserDepartment);
app.use("/clients/:client", middleware.fetchClient);
app.use("/org/clients/:client", middleware.fetchClient);

// These need to go after the client, dept, user, etc. have been acquired
app.use(middleware.logging);
app.use(middleware.setApplicationDetails);
app.use(middleware.setUserAndLevel);

app.use(middleware.attachErrorHandlers);
app.use(middleware.attachLoggingTools);
app.use(middleware.attachRoutingTools);
app.use(middleware.attachTemplateLibraries);
app.use(middleware.templateHelpers);

const AccessController          = require('./controllers/access');
const AlertsController          = require('./controllers/alerts');
const CaptureBoardController    = require('./controllers/capture');
const ClientsController         = require('./controllers/clients');
const ColorsController          = require('./controllers/colors');
const ConversationsController   = require('./controllers/conversations');
const CommunicationsController  = require('./controllers/communications');
const DashboardController       = require('./controllers/dashboard');
const DepartmentsController     = require('./controllers/departments');
const GroupsController          = require('./controllers/groups');
const NotificationsController   = require('./controllers/notifications');
const PhoneNumbers              = require('./controllers/phoneNumbers');
const RootController            = require('./controllers/root');
const SettingsController        = require('./controllers/settings');
const SmsController             = require('./controllers/sms');
const TemplatesController       = require('./controllers/templates');
const UsersController           = require('./controllers/users');
const EmailsController          = require('./controllers/emails');
const VoiceController           = require('./controllers/voice');

app.get("/", RootController.index);

app.post("/webhook/sms", SmsController.webhook);
app.post("/webhook/voice", VoiceController.webhook);
app.post("/webhook/voice/status", VoiceController.status);
app.post("/webhook/voice/transcribe", VoiceController.transcribe);
app.post("/webhook/voice/record", VoiceController.record);
app.post("/webhook/voice/save-recording", VoiceController.save);
app.post("/webhook/voice/play-message", VoiceController.playMessage);
app.post("/webhook/email", EmailsController.webhook);
app.post("/webhook/email/status", EmailsController.status);

app.get("/login", AccessController.login);
app.post("/login", passport.authenticate("local-login", {
    successRedirect: "/",
    failureRedirect: "/login-fail"
  })
);
app.get("/login-fail", AccessController.loginFail);
app.get("/login/reset", AccessController.reset);
app.post("/login/reset", AccessController.resetSubmit);
app.get("/login/reset/:uid", AccessController.resetSpecific);
app.post("/login/reset/:uid", AccessController.resetSpecficSubmit);

// Everything below this, you must be logged in
app.use(auth.isLoggedIn);
app.use(auth.checkIsAllowed);

app.get("/logout", AccessController.logout);

app.get("/alerts", AlertsController.checkForNewMessages);
app.get("/alerts/:alert/close", AlertsController.close);

app.get("/colors", ColorsController.index);
app.post("/colors", ColorsController.create);
app.get("/colors/:color/remove", ColorsController.remove);

app.get("/notifications", NotificationsController.index);
app.get("/notifications/create", NotificationsController.new);
app.get("/notifications/create/compose", NotificationsController.compose);
app.post("/notifications/create/compose", NotificationsController.composeCreate);
app.get("/notifications/create/templates", NotificationsController.templates);
app.post("/notifications/create", NotificationsController.create);
app.get("/notifications/:notification/edit", NotificationsController.edit);
app.post("/notifications/:notification/edit", NotificationsController.update);
app.get("/notifications/:notification/remove", NotificationsController.remove);

app.get("/templates", TemplatesController.index);
app.get("/templates/create", TemplatesController.new);
app.post("/templates/create", TemplatesController.create);
app.get("/templates/remove/:template", TemplatesController.destroy);
app.get("/templates/edit/:template", TemplatesController.edit);
app.post("/templates/edit/:template", TemplatesController.update);

app.get("/groups", GroupsController.index);
app.get("/groups/create", GroupsController.new);
app.post("/groups/create", GroupsController.create);
app.get("/groups/edit/:group", GroupsController.edit);
app.post("/groups/edit/:group", GroupsController.update);
app.get("/groups/remove/:group", GroupsController.destroy);
app.get("/groups/activate/:group", GroupsController.activate);
app.get("/groups/address/:group", GroupsController.address);
app.post("/groups/address/:group", GroupsController.addressUpdate);

app.get("/clients", ClientsController.index);
app.get("/clients/create", ClientsController.new);
app.post("/clients/create", ClientsController.create);

app.get("/clients/:client", ClientsController.clientCard);
app.get("/clients/:client/edit", ClientsController.edit);
app.post("/clients/:client/edit", ClientsController.update);
app.get("/clients/:client/alter/:status", ClientsController.alter);
app.get("/clients/:client/transfer", ClientsController.transferSelect);
app.post("/clients/:client/transfer", ClientsController.transferSubmit);

app.get("/clients/:client/address", ClientsController.addressCraft);
app.get("/clients/:client/address/templates", ClientsController.templates);
app.post("/clients/:client/address", ClientsController.addressSubmit);
app.get("/clients/:client/mediamessage", ClientsController.mediaAttachment);
app.get("/clients/:client/voicemessage", VoiceController.new);
app.post("/clients/:client/voicemessage", VoiceController.create);

app.get("/clients/:client/transcript", ClientsController.transcript);
app.get("/clients/:client/messages", ClientsController.messagesIndex);
app.post("/clients/:client/messages", ClientsController.messagesSubmit);

app.get("/clients/:client/edit/color", ColorsController.select);
app.post("/clients/:client/edit/color", ColorsController.attribute);

app.get("/clients/:client/conversations/:conversation/claim", ConversationsController.claimOption);
app.post("/clients/:client/conversations/:conversation/claim", ConversationsController.claim);

app.get("/clients/:client/communications", CommunicationsController.index);
app.get("/clients/:client/communications/create", CommunicationsController.new);
app.post("/clients/:client/communications/create", CommunicationsController.create);
app.get("/clients/:client/communications/:communication/remove", CommunicationsController.remove);

app.get("/clients/:client/notifications", NotificationsController.index);

app.get("/org", DashboardController.org);

app.get("/org/users", UsersController.index);
app.get("/org/users/create", UsersController.new);
app.post("/org/users/create", UsersController.create);
app.get("/org/users/create/check/:email", UsersController.check);
app.get("/org/users/:targetUser/alter/:case", UsersController.alter);
app.get("/org/users/:targetUser/edit", UsersController.edit);
app.post("/org/users/:targetUser/edit", UsersController.update);
app.get("/org/users/:targetUser/transfer", UsersController.transferIndex);
app.post("/org/users/:targetUser/transfer", UsersController.transferUpdate);

app.get("/org/departments", DepartmentsController.index);
app.get("/org/departments/create", DepartmentsController.new);
app.post("/org/departments/create", DepartmentsController.create);
app.get("/org/departments/:department/edit", DepartmentsController.edit);
app.post("/org/departments/:department/edit", DepartmentsController.update);
app.get("/org/departments/:department/supervisors", DepartmentsController.supervisorsIndex);
app.post("/org/departments/:department/supervisors", DepartmentsController.supervisorsUpdate);
app.get("/org/departments/:department/alter/:case", DepartmentsController.alter);

app.get("/org/numbers", PhoneNumbers.index);
app.get("/org/numbers/create", PhoneNumbers.new);

app.get("/org/clients", ClientsController.index);
app.get("/org/clients/create", ClientsController.new);
app.post("/org/clients/create", ClientsController.create);

app.get("/org/clients/:client", ClientsController.clientCard);
app.get("/org/clients/:client/address", ClientsController.addressCraft);
app.get("/org/clients/:client/address/templates", ClientsController.templates);
app.post("/org/clients/:client/address", ClientsController.addressSubmit);
app.get("/org/clients/:client/voicemessage", VoiceController.new);
app.post("/org/clients/:client/voicemessage", VoiceController.create);

app.get("/org/clients/:client/edit", ClientsController.edit);
app.get("/org/clients/:client/edit", ClientsController.update);
app.get("/org/clients/:client/alter/:status", ClientsController.alter);
app.get("/org/clients/:client/transfer", ClientsController.transferSelect);
app.post("/org/clients/:client/transfer", ClientsController.transferSubmit);
app.get("/org/clients/:client/communications/create", CommunicationsController.new);
app.post("/org/clients/:client/communications/create", CommunicationsController.create);

app.get("/org/captured", CaptureBoardController.index);
app.get("/org/captured/attach/:conversation", CaptureBoardController.attachUserIndex);
app.post("/org/captured/attach/:conversation", CaptureBoardController.attachUserSelect);
app.get("/org/captured/attach/:conversation/user/:user", CaptureBoardController.attachClientIndex);
app.post("/org/captured/attach/:conversation/user/:user", CaptureBoardController.attachUpdate);
app.get("/org/captured/remove/:conversation", CaptureBoardController.removeConfirm);
app.post("/org/captured/remove/:conversation", CaptureBoardController.remove);

app.get("/org/alerts/create", AlertsController.new);
app.post("/org/alerts/create", AlertsController.create);

app.get("/settings", SettingsController.index);
app.post("/settings", SettingsController.update);

// Redundant catch all
app.get("/*", (req, res) => {
  res.notFound();
});


module.exports = app;