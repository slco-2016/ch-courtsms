const credentials = require('../../credentials');
const MixpanelFactory = require('mixpanel');
const detector = require('device-detector');
const Hashids = require('hashids');

// initialize mixpanel client configured to communicate over https
const mixpanel = MixpanelFactory.init(credentials.mixpanel.token, {
  protocol: 'https',
});

function _extract_value(obj, key) {
  // extract a value from an object or return undefined if it doesn't exist
  return (obj && obj.hasOwnProperty(key)) ? obj[key] : undefined;
}

function _extract_source_from_referer(referer) {
  if (referer === undefined) {
    return undefined;
  }

  let sources = [
    'clientcomm',
    'google',
    'bing',
    'yahoo',
    'facebook',
    'twitter',
  ];
  for (let source in sources) {
    if (referer.search('https?://(.*)' + sources[source] + '.([^/?]*)') === 0) {
      return sources[source];
    }
  }
  return 'other';
}

function _get_major_version(version) {
  return typeof version === 'string' ? version.split('.')[0] : version;
}

module.exports = {
  track(distinct_id, label, req, locals, data = {}) {
    // the user object is placed on the request by the passport auth library
    user = typeof req.user === undefined ? undefined : req.user;

    // from package.json (via locals)
    data.clientcomm_version = locals.CLIENTCOMM_APPLICATION.VERSION;

    // from headers
    data.clientcomm_instance_name = credentials.clientcommInstanceName;
    data.source = _extract_source_from_referer(req.headers.referer);
    data.ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    // from user-agent
    let client = detector.parse(req.headers['user-agent']);
    data.client_user_agent = client.userAgent;
    data.client_device_type = client.type;
    data.client_name = client.browser;
    data.client_engine = client.engine;
    data.client_full_version = client.version;
    data.client_major_version = _get_major_version(client.version);
    data.client_os_name = client.os;

    // from query
    data.utm_source = _extract_value(req.query, 'utm_source');
    data.utm_medium = _extract_value(req.query, 'utm_medium');
    data.utm_campaign = _extract_value(req.query, 'utm_campaign');

    // about the user
    data.user_logged_in = false;
    if (user) {
      data.user_logged_in = true;
      data.user_id = user.cmid;
      data.user_class = user.class;
      data.user_department_name = locals.department.name;

      // use the user ID for the distinct_id if it's not set
      distinct_id = !distinct_id ? user.cmid : distinct_id;
      let hasher = new Hashids(data.clientcomm_instance_name);
      distinct_id = hasher.encode(distinct_id);
    }

    // use the visitor_id for the distinct_id if it's not set
    distinct_id = !distinct_id ? req.session.visitor_id : distinct_id;

    data.distinct_id = distinct_id;

    // send the data to mixpanel
    mixpanel.track(label, data);
  },
};
