exports.handler = (function() {
  var url = require('url'),
    https = require('https'),
    querystring = require('querystring'),
    browseridVerify = require('browserid-verifier'),
    fs = require('fs'),
    userDb = require('./config').config;

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
    var userAddressParts = userAddress.split('@');
    var options = {
      host: userAddressParts[1],
      port: 443,
      path: '/.well-known/host-meta',
      method: 'GET'
    }
    //var request = https.request(options, function(response) {
    //  if(response.statusCode == 200) {
    //    //parse the xml
    //  } else {
        var authStr = userDb.usr + ':' + userDb.pwd;
        var options2 = {
          host: userDb.host,
          port: 443,
          path: '/'+userDb.dbName+'/'+userAddress,
          method: 'PUT',
          headers: {
            'Authorization': 'Basic ' + new Buffer(authStr).toString('base64')
          }
        };
        console.log(options);
        var adminPwd = randStr(40);
        var data= {
          adminPwd: adminPwd,
          userAddress: userAddress
        }
        res.writeHead(200, {
          'Content-type': 'application/json',
          'Access-Control-Allow-Origin': origin
        });
        res.write(JSON.stringify(data));
        res.end();
        var request2 = https.request(options2, function(response2) {
          console.log('STATUS: ' + response2.statusCode);
          response2.setEncoding('utf8');
          var resStr = '';
          response2.on('data', function (chunk) {
            resStr += chunk;
            console.log('BODY2: ' + chunk);
          });
          response2.on('end', function() {
            console.log('END2');
          });
        });
        request2.write(JSON.stringify(data));
        request2.end();
    //  }
    //});
  }
  function serveGet(req, res, postData) {
    console.log('serveGet');
    console.log(postData);
    browseridVerify(postData, function(err, r) {
      if(err) {
        console.log('err');
        var headers = {
          'Content-type': 'text/plain',
          'Access-Control-Allow-Origin': req.headers.origin
        };
        console.log(req.headers);
        console.log(headers);
        res.writeHead(500, headers);
        res.write(JSON.stringify(err));
        res.end();
      } else {
        console.log('no err');
        if(r.email) {
          console.log(r.email+' confirmed by browserid verifier');
          var authStr = userDb.usr + ':' + userDb.pwd;
          console.log(authStr);
          var options = {
            host: userDb.host,
            port: 443,
            path: '/'+userDb.dbName+'/'+r.email,
            method: 'GET', 
            headers: {
              'Authorization': 'Basic ' + new Buffer(authStr).toString('base64')
            }
          };
          console.log(options);
          var request = https.request(options, function(response) {
            console.log('STATUS: ' + response.statusCode);
            console.log('HEADERS: ' + JSON.stringify(response.headers));
            response.setEncoding('utf8');
            var resStr = '';
             response.on('data', function (chunk) {
              resStr += chunk;
              console.log('BODY: ' + chunk);
            });
             response.on('end', function() {
              if(response.statusCode == 404) {
                webfingerLookup(r.email, 'http://libredocs.org', res);
              } else {
                console.log('END; writing to res: "'+resStr+'"');
                response.headers['Access-Control-Allow-Origin'] = req.headers.Origin;
                res.writeHead(response.statusCode, response.headers);
                res.write(resStr);
                res.end();
              }
            });
          });
          //console.log('writing to the request');

          //var data = JSON.stringify({
          //});
          //console.log(data);
          //request.write(data);
          console.log('ending the request');
          request.end();
          console.log('setting request.on(\'response\', ...)');
        }
      }
    });
  }
  function store(userObj, err, cb) {
    console.log('storing userObj:');
    console.log(userObj);
    var authStr = userDb.usr + ':' + userDb.pwd;
    console.log(authStr);
    var options = {
      host: userDb.host,
      port: 443,
      path: '/'+userDb.dbName+'/'+userObj.userAddress,
      method: 'PUT', 
      headers: {
        'Authorization': 'Basic ' + new Buffer(authStr).toString('base64')
      }
    };
    console.log(options);
    var request = https.request(options, function(response) {
      console.log('STATUS: ' + response.statusCode);
      console.log('HEADERS: ' + JSON.stringify(response.headers));
      response.setEncoding('utf8');
      var resStr = '';
      response.on('data', function (chunk) { 
        resStr += chunk;
        console.log('BODY: ' + chunk);
      });
      response.on('end', function() { 
        if(response.statusCode == 201) {
           cb();
        } else {
          console.log(response.statusCode)
          console.log(response.headers);
          console.log('oops:'+resStr);
          err();
        }
      });
    });
    console.log('sending the userObj');
    request.write(JSON.stringify(userObj));
    console.log('ending the request');
    request.end();
  }

  function serveSet(req, res, params) {
    console.log('serveSet');
    console.log(params);
    var authStr = userDb.usr + ':' + userDb.pwd;
    console.log(authStr);
    var options = {
      host: userDb.host,
      port: 443,
      path: '/'+userDb.dbName+'/'+params.userAddress,
      method: 'GET', 
      headers: {
        'Authorization': 'Basic ' + new Buffer(authStr).toString('base64')
      }
    };
    console.log(options);
    var request = https.request(options, function(response) {
      console.log('STATUS: ' + response.statusCode);
      console.log('HEADERS: ' + JSON.stringify(response.headers));
      response.setEncoding('utf8');
      var resStr = '';
      response.on('data', function (chunk) { 
        resStr += chunk;
        console.log('BODY: ' + chunk);
      });
      response.on('end', function() { 
        if(response.statusCode == 404) {
          res.writeHead(response.statusCode, response.headers);
          res.write('cannot find user "'+params.userAddress+'":'+resStr);
          res.end();
        } else {
          console.log('END; got res: "'+resStr+'"');
          var existingRecord = JSON.parse(resStr);
          if(params.adminPwd == existingRecord.adminPwd) {
            console.log('password "'+params.adminPwd+'" accepted');
            params._rev = existingRecord._rev;
            store(params, function() {
              res.writeHead(500, {});
              res.end();
            }, function() {
              res.writeHead(200, {});
              res.write('stored');
              res.end();
            });
          } else {
            console.log('password "'+params.adminPwd+'" rejected');
            res.writeHead(401, {});
            res.write('not the right adminPwd');
            res.end();
          }
        }
      });
    });
    console.log('ending the request');
    request.end();
  }
  function serve(req, res, baseDir) {
    if(req.method=='OPTIONS') {
      res.writeHead(200, {
        //'Access-Control-Allow-Origin': req.headers.origin,
        'Access-Control-Allow-Origin': 'http://myfavouritesandwich.org',
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
        console.log(incoming);
        if(incoming.action == 'set') {
          serveSet(req, res, incoming);
        } else {
          serveGet(req, res, {
            audience: 'http://libredocs.org',
            assertion: incoming.assertion
          });
        }
      });
    }
  }
  return {
    serve: serve
  };
})();
