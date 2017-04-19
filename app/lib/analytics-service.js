const credentials = require('../../credentials');
const packageinfo = require('./package-info');
const MixpanelFactory = require('mixpanel');
const detector = require('device-detector');
const Hashids = require('hashids');

// initialize mixpanel client configured to communicate over https
const mixpanel = MixpanelFactory.init(credentials.mixpanel.token, {
  protocol: 'https',
});

function _get_instance_name(host) {
  // get the instance of clientcomm running, based on the host
  let instance_name = host.split('.')[0];

  // special cases where a single instance can have multiple host names
  if (['www', 'clientcomm'].indexOf(instance_name) > -1) {
    instance_name = 'splash';
  } else if (['secure', 'saltlake'].indexOf(instance_name) > -1) {
    instance_name = 'saltlake';
  } else if (instance_name === '127' || instance_name.match('localhost')) {
    instance_name = 'development';
  }

  return instance_name;
}

function _extract_value(obj, key) {
  // extract a value from an object or return undefined if it doesn't exist
  return typeof obj[key] === undefined ? undefined : obj[key];
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
  track(distinct_id, label, request, locals, data = {}) {
    // the user object is placed on the request by the passport auth library
    user = typeof request.user === undefined ? undefined : request.user;

    // from package.json
    data.clientcomm_version = packageinfo.version;

    // from headers
    data.clientcomm_instance = _get_instance_name(request.headers.host);
    data.source = _extract_source_from_referer(request.headers.referer);
    data.ip = _extract_value(request, 'ip');
    // from user-agent
    let client = detector.parse(request.headers['user-agent']);
    data.client_user_agent = client.userAgent;
    data.client_device_type = client.type;
    data.client_name = client.browser;
    data.client_engine = client.engine;
    data.client_full_version = client.version;
    data.client_major_version = _get_major_version(client.version);
    data.client_os_name = client.os;

    // from query
    data.utm_source = _extract_value(request.query, 'utm_source');
    data.utm_medium = _extract_value(request.query, 'utm_medium');
    data.utm_campaign = _extract_value(request.query, 'utm_campaign');

    // about the user
    data.user_logged_in = false;
    if (user) {
      data.user_logged_in = true;
      data.user_id = user.cmid;
      data.user_class = user.class;
      data.user_department_name = locals.department.name;

      // use the user ID for the distinct_id if it wasn't sent
      distinct_id = distinct_id === null ? user.cmid : distinct_id;
    }

    // save distinct_id in data; hash it with the instance name for uniqueness
    let hasher = new Hashids(data.clientcomm_instance);
    data.distinct_id = hasher.encode(distinct_id);

    console.log(distinct_id);
    console.log(data.distinct_id);

    // send the data to mixpanel
    mixpanel.track(label, data);
  },
};
