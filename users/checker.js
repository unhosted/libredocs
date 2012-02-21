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
            redisClient.keys('*', function(err, keys) {
              redisClient.mget(keys, function(err, data) {
                var states = {}, problems = {}, oks = {}, userNameTries = {};
                console.log('err:'+err);
                for(i in data) {
                  d = JSON.parse(data[i]);
                  states[d.state] = (states[d.state] || 0) + 1;
                  problems[d.problem] = (problems[d.problem] || 0) + 1;
                  oks[d.ok] = (oks[d.ok] || 0) + 1;
                  userNameTries[d.userNameTry] = (userNameTries[d.userNameTry] || 0) + 1;
                }
                var res = {
                  states: states,
                  problems: problems,
                  oks: oks,
                  userNameTries: userNameTries
                }
                console.log(JSON.stringify(res, null, 2));
              });
              redisClient.quit();
            });
            console.log('outside redisClient.keys');
          });
          console.log('outside initRedis');
})();
