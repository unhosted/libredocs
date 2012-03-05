exports.handler = (function() {
  var url = require('url'),
    //https = require('https'),
    //querystring = require('querystring'),
    //browseridVerify = require('browserid-verifier'),
    //fs = require('fs'),
    userDb = require('../userDbCredentials').userDbCredentials,
    redis = require('redis'),
    redisClient;
  
  function initRedis(cb) {
    console.log('initing redis');
    redisClient = redis.createClient(userDb.port, userDb.host);
    redisClient.on("error", function (err) {
      console.log("error event - " + redisClient.host + ":" + redisClient.port + " - " + err);
    });
    redisClient.auth(userDb.pwd, function() {
       console.log('redis auth done');
       //redisClient.stream.on('connect', cb);
       if(cb) cb();
    });
  }
  function serveGet(req, res, postData) {
    initRedis();
    redisClient.get(postData.userAddress, function(err, data) {
      console.log('this came from redis:');
      console.log(err);
      console.log(data);
      try {
        data = JSON.parse(data);
      } catch(e) {
      }
      if(!data) {
        data={};
      }
      if((!data.storageInfo) && (data.subdomain && data.proxy)) {
        data.storageInfo = {
          api: 'CouchDB',
          template: 'http://'+data.proxy+data.subdomain+'.iriscouch.com/{category}/',
          auth: 'http://'+data.subdomain + '.iriscouch.com/cors/auth/modal.html'
        };
      }
      headers = {'Access-Control-Allow-Origin': postData.audience};
      if(data.storageInfo) {
        res.writeHead(200, headers);
        res.write(JSON.stringify(data.storageInfo));
      } else {
        res.writeHead(404, headers);
      }
      res.end();
    });
    console.log('outside redisClient.get');
    redisClient.quit();
  }

  function serve(req, res, baseDir) {
    if(req.method=='OPTIONS') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': req.headers.origin,
        'Access-Control-Allow-Methods': 'POST, PUT, GET',
        'Access-Control-Allow-Headers': 'Origin, Content-Type'
      });
      res.end();
    } else {
      console.log('serve');
      var dataStr = '';
      req.on('data', function(chunk) {
        dataStr += chunk;
      });
      req.on('end', function() {
        var incoming;
        try {
          incoming = JSON.parse(dataStr);
          console.log('incoming post:');
          console.log(incoming);
          console.log('end of incoming post');
          serveGet(req, res, incoming);
          console.log('done with req.on(end)');
        } catch(e) {
          console.log('unparsable '+dataStr);
          res.writeHead(500, {
            'Access-Control-Allow-Origin': req.headers.origin,
            'Access-Control-Allow-Methods': 'POST, PUT, GET',
            'Access-Control-Allow-Headers': 'Origin, Content-Type'
          });
          res.end();
        }
      });
    }
  }

  return {
    serve: serve
  };
})();
