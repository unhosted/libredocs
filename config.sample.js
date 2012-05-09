exports.config = {
  port: 80,
  redirect: {
    'www.libredocs.org': 'http://libredocs.org',
    'www.libredoc.org': 'http://libredocs.org',
    'libredoc.org': 'http://libredocs.org'
  },
  host: {
    'libredocs.org': '/static',
    'libredocs.local': '/static'
  }
};
