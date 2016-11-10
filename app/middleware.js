const Alerts = require('./models/alerts');
const Clients = require('./models/clients');
const Conversations = require('./models/conversations');
const Departments = require('./models/departments');
const Messages = require('./models/messages');
const Organizations = require('./models/organizations');
const Users = require('./models/users');

function _capitalize (word) {
  return word.split(' ').map(function (name) {
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }).join(' ');
}

module.exports = {

  attachLoggingTools(req, res, next) {

    req.logActivity = {
      client: (client) => {
        Clients.logActivity(client)
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
          return null;
        }).catch((err) => {
          console.log(err.yellow);
          return null;
        });
      },
    };

    next();
  },

  attachRoutingTools(req, res, next) {

    req.getUser = () => {
      let id = req.user.cmid;
      try {
        id = res.locals.client.cm;
        return id;
      } catch(e) {
        return id;
      }
    };

    res.levelSensitiveRedirect = (path) => {
      let endPath = '';
      try {
        let base = '';
        if (res.locals.level == 'org') {
          base = '/org';
        }
        endPath = `${base}${path}`;
      } catch(e) {
        endPath = '/';
      }
      res.redirect(endPath);
    };

    next();

  },

  setApplicationDetails(req, res, next) {
    res.locals.CLIENTCOMM_APPLICATION = {
      VERSION: require('../package.json').version,
    };

    next();
  },

  attachTemplateLibraries(req, res, next) {
    res.locals.moment = require('moment');
    res.locals.momentTz = require('moment-timezone');
    
    if (process.env.CCENV && process.env.CCENV == 'production') {
      console.log('Production env. New Relic running.');
      res.locals.newrelic = require('newrelic');
    } else {
      res.locals.newrelic = null;
    }

    next();
  },

  attachErrorHandlers(req, res, next) {

    res.error500 = (err) => {
      // Clean up error if one is provided
      if (typeof err !== 'undefined') {

        // Log the error if passed in
        console.log(`\n Error occured. \n Timestamp: ${new Date()}`.yellow);
        console.log(err.stack);
        console.log('--- \n');

      // If there is no error, provide a generic phrase
      } else {
        stringErr = 'Internal Error 500 Something happened.';
      }

      // Produce a response to the client
      res.set({'content-type':'text/plain',}).status(500).send(err.stack);
      
    };

    res.notFound = () => {
      res.status(404).render('general/404');
    };

    next();
  },

  logging(req, res, next) {
    if (process.env.CCENV !== 'testing') {
      const start = new Date();
      res.on('finish', () => {
        const milliseconds = new Date().getTime() - start.getTime();
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const timestamp = start.toUTCString();
        const method = req.method;
        const path = req.originalUrl;
        const statusCode = res.statusCode;
        const contentLength = res.header()._headers['content-length'] || 0;
        const userAgent = req.headers['user-agent'];

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
      if (level == 'org') {
        url = `/org${url}`;
      }

      let options = '';
      if (optionsList) {
        optionsList.forEach((opt) => {
          const capitalizedOption = opt.charAt(0).toUpperCase() + opt.slice(1);
          options += `
            <a href="${url}?status=${opt}">
              <div class="option ${hub.sel === opt ? 'selected' : ''}">${capitalizedOption}</div>
            </a>
          `;
        });
      }

      if (level == 'org') {
        if (capitalized == 'Clients') {
          capitalized = 'All Clients';
        } else if (capitalized == 'Captured') {
          capitalized = 'Unclaimed';
        }
      }

      return `
        <div class="leftTab ${hub.tab == name ? 'open' : 'closed'}">
          <div class="title"><a href="${url}">${capitalized}</a></div>
          ${options}
        </div>
      `;
    };

    res.locals.rightTab = (name, fa, level) => {
      const capitalizedSingular = (name.charAt(0).toUpperCase() + name.slice(1)).slice(0, -1);
      
      let url = `/${name}`;
      if (level == 'org') {
        url = `/org${url}`;
      }

      return `
        <div class="rightActions">
          <a href="${url}/create">
            <span class="fa-stack fa-lg">
              <i class="fa fa-circle fa-stack-2x"></i>
              <i class="fa fa-${fa} fa-stack-1x fa-inverse"></i>
            </span>
            <span class="text"><b>+</b> ${capitalizedSingular}</span>
          </a>
        </div>
      `;
    };

    next();
  },

  fetchUserAlertsFeed(req, res, next) {
    // Two alert types, flash and alerts from feed
    res.locals.FLASH_ALERTS = {
      WARNINGS: req.flash('warning'),
      SUCCESSES: req.flash('success'),
    };

    if (req.user) {
      Alerts.findByUser(req.user.cmid)
      .then((alerts) => {
        res.locals.ALERTS_FEED = alerts;
        next();
        return null;
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
        return null;
      }).catch(res.error500);
    } else {
      next();
    }
  },

  fetchUserDepartment(req, res, next) {
    if (req.user) {
      const departmentId = req.user.department;
      return Departments.findById(departmentId)
      .then((department) => {
        // if no department, provide some dummy attributes
        if (!department) {
          department = {
            name:          'Unassigned',
            organization:  req.user.org,
            phone_number:  null,
            department_id: null,
          };
        }
        res.locals.department = department;
        next();
        return null;
      }).catch(res.error500);
    } else {
      next();
    }
  },

  fetchClient(req, res, next) {
    if (req.user) {
      // Set base case that you are viewing a client that is not yours
      res.locals.userOwnsClient = false;

      const p = req.params;

      const client = p.client || p.clientId || p.clientID || null;
      const isNumber = !isNaN(client);
      
      if (client && isNumber) {
        Clients.findByID(client)
        .then((c) => {
          if (c) {
            c.first = _capitalize(c.first);
            c.middle = _capitalize(c.middle);
            c.last = _capitalize(c.last);

            res.locals.client = c;

            // If client is under user, then update user flag
            if (c.cm == req.user.cmid) {
              res.locals.userOwnsClient = true;
            }

            next();
          } else {
            res.status(404).render('v4/general/404');
          }
          return null;
        }).catch(res.error500);
      } else {
        next();
      }
    } else {
      next();      
    }
  },

  setUserAndLevel(req, res, next) {
    res.locals.level = 'user';
    if (req.url.indexOf('/org') == 0) {
      res.locals.level = 'org';
    }

    res.locals.user = req.user;
    next();
  },

  getUserPerformance(req, res, next) {
    if (req.user) {
      Users.getPerformanceComparedToTopInOrganizationThisWeek(req.user.cmid)
      .then((performance) => {
        if (res.locals.user) {
          res.locals.user.performanceThisWeek = performance;
          next();
        } else {
          next();
        }
      }).catch(res.error500);
    } else {
      next();
    }
  },

};