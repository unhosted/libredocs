exports.handler = (function() {
  var url = require('url'),
    https = require('https'),
    querystring = require('querystring'),
    //browseridVerify = require('browserid-verifier'),
    fs = require('fs'),
    userDb = require('../userDbCredentials').userDbCredentials,
    redis = require('redis'),
    webfinger = require('./webfinger').webfinger;
  
  function initRedis(cb) {
    console.log('initing redis');
    var redisClient = redis.createClient(userDb.port, userDb.host);
    redisClient.on("error", function (err) {
      console.log("error event - " + redisClient.host + ":" + redisClient.port + " - " + err);
    });
    redisClient.auth(userDb.pwd, function() {
       console.log('redis auth done');
       //redisClient.stream.on('connect', cb);
       cb(redisClient);
    });
  }

  function getStorageInfo(userAddress, cb) {
    webfinger.lookup('acct:'+userAddress, function(err, xrdObj) {
      var storages = xrdObj.getLinksByRel('remoteStorage');
      if(storages.length == 1) {
        var apis= storages[0].getAttrValues('api');
        var templates= storages[0].getAttrValues('template');
        var auths= storages[0].getAttrValues('auth');
        if(apis.length == 1 && templates.length == 1 && auths.length == 1) {
          cb(0, {
            api: apis[0],
            template: templates[0],
            auth: auths[0]
          });
          return;
        }
      }
      cb(422, {});
    });
  }
  function maybeStore(userAddress, bearerToken, cb) {
    getStorageInfo(userAddress, function(err, storageInfo) {
      if(err) {
        cb(false);
      } else {
        console.log(storageInfo);
        initRedis(function(redisClient) {
          redisClient.get(userAddress, function(err, resp) {
            var data = {};
            try {
              data = JSON.parse(resp);
            } catch(e) {
            }
            if(!data.storageInfo) {
              data.storageInfo=storageInfo;
            }
            if(!data.bearerToken) {//this way noone can actually do any harm with this.
              data.bearerToken=bearerToken;
            }
            redisClient.set(userAddress, JSON.stringify(data), function(err, resp) {
              cb(true);
            });
          });
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
