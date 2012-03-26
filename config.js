exports.config = {
  port: 80,
  redirect: {
    'libredocs.nodejitsu.com': 'http://libredocs.org',
    'www.libredocs.org': 'http://libredocs.org',
    'www.libredoc.org': 'http://libredocs.org',
    'libredoc.org': 'http://libredocs.org'
  },
  host: {
    'libredocs.org': '/static',
    'mich.libredocs.org': '/static',
    'libredocs.local': '/static'
  },
  pathHandler: {
    'libredocs.org/storeBearerToken': './storeBearerToken',
    'libredocs.local/storeBearerToken': './storeBearerToken'
  }
};
