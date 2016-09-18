const Alerts = require('./models/alerts');
const Client = require('./models/client');
const Conversations = require('./models/Conversations');
const Departments = require('./models/departments');
const Organizations = require('./models/organizations');

module.exports = {

  attachLoggingTools(req, res, next) {

    req.logActivity = {
      client: (client) => {
        Client.logActivity(client)
        .then(() => {
          // Log client activity success...
        }).catch(() => {
          console.log(err.yellow);
        });
      },

      conversation: (conversation) => {
        Conversations.logActivity(conversation)
        .then(() => {
          // Log conversation activity success...
        }).catch((err) => {
          console.log(err.yellow);
        });
      },
    };
    next();

  },

  attachErrorHandlers(req, res, next) {

    res.error500 = (err) => {
      // Clean up error if one is provided
      if (typeof err !== "undefined") {

        // Log the error if passed in
        console.log(`\n Error occured. \n Timestamp: ${new Date()}`.yellow);
        console.log(err.stack);
        console.log("--- \n");

      // If there is no error, provide a generic phrase
      } else {
        stringErr = "Internal Error 500 Something happened.";
      }

      // Produce a response to the client
      res.set({'content-type':'text/plain'}).status(500).send(err.stack)
    };

    res.notFound = () => {
      res.status(404).render('v4/general/404')
    };

    next();
  },

  logging(req, res, next) {
    if (process.env.CCENV !== 'testing') {
      let start = new Date()
      res.on('finish', () => {
        let milliseconds = new Date().getTime() - start.getTime()
        let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        let timestamp = start.toUTCString();
        let method = req.method;
        let path = req.originalUrl;
        let statusCode = res.statusCode;
        let contentLength = res.header()._headers['content-length'] || 0;
        let userAgent = req.headers['user-agent'];
        console.log(
          `${ip} -- [${timestamp}] ` +
          `${method} ${path} ${statusCode} `.magenta +
          `${contentLength} ${milliseconds}ms `.cyan +
          `"${userAgent}"`
        );
      });
    }
    return next();
  }, 

  templateHelpers(req, res, next) {
    res.locals.leftTab = (name, hub, level, optionsList) => {
      let capitalized = name.charAt(0).toUpperCase() + name.slice(1);

      let url = `/${name}`;
      if (level == "org") {
        url = `/org${url}`;
      }

      let options = ``;
      if (optionsList) {
        optionsList.forEach((opt) => {
          let capitalizedOption = opt.charAt(0).toUpperCase() + opt.slice(1);
          options += `
            <a href="${url}?status=${opt}">
              <div class="option ${hub.sel === opt ? 'selected' : ''}">${capitalizedOption}</div>
            </a>
          `;
        });
      }

      return `
        <div class="leftTab ${hub.tab == name ? 'open' : 'closed'}">
          <div class="title"><a href="${url}">${capitalized}</a></div>
          ${options}
        </div>
      `
    };

    res.locals.rightTab = (name, fa, level) => {
      let capitalizedSingular = (name.charAt(0).toUpperCase() + name.slice(1)).slice(0, -1);
      
      let url = `/${name}`;
      if (level == "org") {
        url = `/org${url}`;
      }

      return `
        <div class="rightActions">
          <a href="${url}/create">
            <span class="fa-stack fa-lg">
              <i class="fa fa-circle fa-stack-2x"></i>
              <i class="fa fa-${fa} fa-stack-1x fa-inverse"></i>
            </span>
            <span class="text">New ${capitalizedSingular}</span>
          </a>
        </div>
      `;
    };

    next();
  },

  fetchUserAlertsFeed(req, res, next) {
    if (req.user) {
      Alerts.findByUser(req.user.cmid)
      .then((alerts) => {
        res.locals.ALERTS_FEED = alerts;
        next();
      }).catch(res.error500);
    } else {
      next();
    }
  },

  fetchUserOrganization(req, res, next) {
    if (req.user) {
      Organizations.findByID(req.user.org)
      .then((org) => {
        res.locals.organization = org;
        next();
      }).catch(res.error500);
    } else {
      next();
    }
  },

  fetchUserDepartment(req, res, next) {
    if (req.user) {
      Departments.findByID(req.user.department)
      .then((department) => {
        // if no department, provide some dummy attributes
        if (!department) {
          department = {
            name:          "Unassigned",
            organization:  req.user.org,
            phone_number:  null,
            department_id: null
          };
        }
        res.locals.department = department;
        next();
      }).catch(res.error500);      
    } else {
      next();      
    }
  },

  fetchClient(req, res, next) {
    let p = req.params;
    let client = p.client || p.clientId || p.clientID || null;
    let isNumber = !isNaN(client);
    
    if (client && isNumber) {
      Client.findByID(client)
      .then((c) => {
        if (c) {
          res.locals.client = c;
          next();
        } else {
          notFound(res);
        }
      }).catch(res.error500);
    } else {
      next();
    }

  },

  setLevel(req, res, next) {
    res.locals.level = "user";
    if (req.url.indexOf("/org") == 0) {
      res.locals.level = "org";
    }
    next();
  },

}