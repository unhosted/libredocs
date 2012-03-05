exports.handler = (function() {
  var url = require('url'),
    https = require('https'),
    querystring = require('querystring'),
    //browseridVerify = require('browserid-verifier'),
    fs = require('fs'),
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
       cb();
    });
  }
  function browseridVerify(obj, cb) {
    var queryStr = 'audience='+obj.audience+'&assertion='+obj.assertion;
    var options = {
      host: 'browserid.org',
      port: 443,
      path: '/verify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': queryStr.length
      }
    };
    console.log('query string:');
    console.log(queryStr);
    console.log('posting:');
    console.log(options);
    var request = https.request(options, function(response) {
      var dataStr='';
      response.on('data', function(chunk) {
        dataStr += chunk;
      });
      response.on('end', function() {
        console.log('response from verify:');
        console.log(dataStr);
        var r = JSON.parse(dataStr);
        cb((r.status!='okay'), r);
      });
    });
    request.write(queryStr);
    request.end();
  }

  function randStr(length) {
    var buffer = new Buffer(length);
    var fd = fs.openSync('/dev/urandom', 'r');
    fs.readSync(fd, buffer, 0, buffer.length, 0);
    fs.closeSync(fd);
    var randStr = buffer.toString('base64');
    console.log('generated randStr of length '+randStr.length+' ('+length+'):'+randStr);
    return randStr;
  }
  function webfingerLookup(userAddress, origin, res) {
    console.log('webfingerLookup');
//    var userAddressParts = userAddress.split('@');
//    var options = {
//      host: userAddressParts[1],
//      port: 443,
//      path: '/.well-known/host-meta',
//      method: 'GET'
//    }
//    var request = https.request(options, function(response) {
//      if(response.statusCode == 200) {
//        //parse the xml
//      } else {
        var adminPwd = randStr(40);
        var data= {
          adminPwd: adminPwd,
          userAddress: userAddress
        }
        redisClient.set(userAddress, JSON.stringify(data), function(err, resp) {
          res.writeHead(200, {
            'Content-type': 'application/json',
            'Access-Control-Allow-Origin': origin
          });
          res.write(JSON.stringify(data));
          res.end();
        });
//      }
//    });
  }
  function serveGet(req, res, postData) {
    console.log('serveGet');
    console.log(postData);
    browseridVerify(postData, function(err, r) {
      if(err) {
        console.log('err');
        var headers = {
          'Content-type': 'text/plain',
          'Access-Control-Allow-Origin': postData.audience
        };
        console.log(req.headers);
        console.log(headers);
        res.writeHead(500, headers);
        res.write(JSON.stringify(err));
        res.end();
      } else {
        console.log('no err');
        if(r.email) {
          initRedis(function() {
            redisClient.get(r.email, function(err, data) {
              console.log('this came from redis:');
              console.log(err);
              console.log(data);
              if(data == '[object Object]') {
                data = null;
                console.log('oops');
              }
              else
              {
                data = JSON.parse(data);
              }
              if(data) {
                headers = {'Access-Control-Allow-Origin': postData.audience};
                res.writeHead(200, headers);
                res.write(JSON.stringify(data));
                res.end();
              } else {
                console.log('go to webfinger');
                webfingerLookup(r.email, postData.audience, res);
              }
              redisClient.quit();
            });
            console.log('outside redisClient.get');
          });
          console.log('outside initRedis');
        } else {
          console.log('we have no r.email - X');
        }
        console.log('after r.email switch');
      }
      console.log('end inside browseridVerify');
    });
    console.log('outside browseridVerify');
  }

  function serveSet(req, res, params) {
    initRedis(function() {
      redisClient.get(params.userAddress, function(err, existingRecord) {
        if(existingRecord) {
          console.log('existing record:');
          console.log(existingRecord);
          existingRecord = JSON.parse(existingRecord);
          if(existingRecord=='[object Object]' || params.adminPwd == existingRecord.adminPwd) {
            console.log('password "'+params.adminPwd+'" accepted');
            params._rev = existingRecord._rev;
            redisClient.set(params.userAddress, JSON.stringify(params), function() {
              console.log('store function called cb');
              res.writeHead(200, {
                'Access-Control-Allow-Origin': req.headers.origin,
                'Access-Control-Allow-Methods': 'POST, PUT, GET',
                'Access-Control-Allow-Headers': 'Origin, Content-Type'
              });
              res.write('stored');
              res.end();
              redisClient.quit();
            });
          } else {
            console.log('password "'+params.adminPwd+'" rejected');
            res.writeHead(401, {
              'Access-Control-Allow-Origin': req.headers.origin,
              'Access-Control-Allow-Methods': 'POST, PUT, GET',
              'Access-Control-Allow-Headers': 'Origin, Content-Type'
            });
            res.write('not the right adminPwd');
            res.end();
            redisClient.quit();
          }
        } else {
          res.writeHead(404, {});
          res.write('cannot find user "'+params.userAddress+'":'+data);
          res.end();
          redisClient.quit();
        }
      });
    });
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
        var incoming = JSON.parse(dataStr);
        console.log('incoming post:');
        console.log(incoming);
        console.log('end of incoming post');
        if((incoming.audience == 'http://libredocs.org') || (incoming.audience == 'http://mich.libredocs.org')) {
          console.log('Welcome, LibreDocs user');
          serveGet(req, res, {
            audience: incoming.audience,
            assertion: incoming.assertion
          });
          console.log('done with serveGet');
        } else if(incoming.audience == 'http://myfavouritesandwich.org') {
          console.log('Welcome, MyFavouriteSandwich user');
          serveGet(req, res, {
            audience: incoming.audience,
            assertion: incoming.assertion
          });
        } else if(incoming.action == 'set') {
          serveSet(req, res, incoming);
        } else {
          console.log('foreign audience '+incoming.audience);
          res.writeHead(401);
          res.end('foreign audience - come to #unhosted on freenode to register it');
        }
        console.log('done with req.on(end)');
      });
    }
  }

  return {
    serve: serve
  };
})();
