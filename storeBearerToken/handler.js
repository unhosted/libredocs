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

  function checkLegit(storageInfo, bearerToken, cb) {
    cb(true);
  }
  function getStorageInfo(userAddress, cb) {
    cb(0, {});
  }
  function maybeStore(userAddress, bearerToken, cb) {
    getStorageInfo(userAddress, function(err, storageInfo) {
      if(err) {
        cb(false);
      } else {
        checkLegit(storageInfo, bearerToken, function(result) {
          if(result) {
            var data= {
              storageInfo: storageInfo,
              bearerToken: bearerToken
            };
            redisClient.set(userAddress, JSON.stringify(data), function(err, resp) {
              cb(true);
            });
          } else {
            cb(false);
          }
        });
      }
    });
  }
  function serve(req, res) {
    var dataStr = '';
    req.on('data', function(chunk) {
      dataStr += chunk;
    });
    req.on('end', function() {
      var incoming;
      try {
        incoming = JSON.parse(dataStr);
      } catch (e) {
        res.writeHead(422);
      }
      console.log('incoming post:');
      console.log(incoming);
      console.log('end of incoming post');
      maybeStore(incoming.userAddress, incoming.bearerToken, function(result) {
        if(result) {
          res.writeHead(201);
          res.end('ok');
        } else {
          res.writeHead(403);
          res.end('Computer says no');
        }
      });
    });
  }
  return {
    serve: serve
  };
})();
