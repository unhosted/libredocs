exports.handler = (function() {
  var url = require('url'),
    https = require('https'),
    querystring = require('querystring'),
    //browseridVerify = require('browserid-verifier'),
    fs = require('fs'),
    userDb = require('./config').config,
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
          initRedis(function() {
            redisClient.del('user@host', function(err, data) {
              console.log('this came from redis:');
              console.log(err);
              console.log(data);
            });
            console.log('outside redisClient.get');
          });
          console.log('outside initRedis');
})();
