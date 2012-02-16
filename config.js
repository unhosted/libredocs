exports.config = {
  port: 80,
  redirect: {
    'libredocs.nodejitsu.com': 'http://libredocs.org',
    'www.libredocs.org': 'http://libredocs.org',
    'www.libredoc.org': 'http://libredocs.org',
    'libredoc.org': 'http://libredocs.org'
  },
  host: {
    'libredocs.org': '/static'
  },
  pathHandler: {
    'libredocs.org/users': './users',
    'libredocs.org/useraddress': './useraddress',
    'libredocs.org/browserid-verifier': './browserid',
    'libredocs.org/provision': './provision',
    'libredocs.org/squat': './squat',
    'libredocs.org/createDb': './createDb',
    'libredocs.org/setConfig': './setConfig'
  }
};
