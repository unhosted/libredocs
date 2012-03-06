exports.handler = (function() {
  var url = require('url'),
    http = require('http'),
    https = require('https'),
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
  function checkLegit(bearerToken, storageInfo, cb) {
    if(storageInfo.template) {
      //upgrade hack:
      if(storageInfo.template.indexOf('proxy.libredocs.org') != -1) {
        storageInfo.template = 'http://proxy.unhosted.org/CouchDB?'
            +storageInfo.template.substring('http://proxy.libredocs.org/'.length);
      }      
      var parts = storageInfo.template.split('{category}');
      if(parts.length==2) {
        var urlObj = url.parse(parts[0]+'documents'+parts[1]+'documents');
            
        var options = {
          host: urlObj.hostname,
          path: urlObj.path + (urlObj.search || ''),
          headers: {'Authorization': 'Bearer '+bearerToken}
        };
        var lib;
        if(urlObj.protocol=='http:') {
          lib = http;
          options.port = urlObj.port || 80;
        } else if(urlObj.protocol=='https:') {
          lib = https;
          options.port = urlObj.port || 443;
        } else {
          cb(false);
          return;
        }
        var req = lib.request(options, function(res) {
          if(res.statusCode==200 || res.statusCode==404) {
            cb(true);
          } else {
            cb(false);
          }
        });
        req.end();
        return;
      }
    }
    cb(false);
  }
  function maybeStore(userAddress, bearerToken, cb) {
    getStorageInfo(userAddress, function(err, storageInfo) {
      if(err) {//might be updating a bearer token, but in that case we need to check it:
        initRedis(function(redisClient) {
          redisClient.get(userAddress, function(err, resp) {
            var data;
            try {
              data = JSON.parse(resp);
            } catch(e) {
            }
            if(data && data.storageInfo) {
              checkLegit(bearerToken, data.storageInfo, function(legit) {
                if(legit) {
                  data.bearerToken=bearerToken;
                  redisClient.set(userAddress, JSON.stringify(data), function(err, resp) {
                    cb(true);
                  });
                } else {
                  cb(false);
                }
              });
            } else {
              cb(false);
            }
          }); 
        });
      } else {
        console.log(storageInfo);
        initRedis(function(redisClient) {
          redisClient.get(userAddress, function(err, resp) {
            var data;
            try {
              data = JSON.parse(resp);
            } catch(e) {
            }
            data = data || {};
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
