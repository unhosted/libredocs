exports.config = {
  port: 80,
  redirect: {
    'www.libredocs.org': 'http://libredocs.org',
    'www.libredoc.org': 'http://libredocs.org',
    'libredoc.org': 'http://libredocs.org'
  },
  host: {
    'libredocs.org': '/static'
  },
  pathHandler: {
    'libredocs.org/browserid-verifier': './browserid',
    'libredocs.org/provision': './provision',
    'libredocs.org/squat': './squat',
    'libredocs.org/createDb': './createDb'
  }
};
