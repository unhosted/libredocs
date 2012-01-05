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
        var token = randStr(40);
        var data= {
          token: token,
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
  function serve(req, res, baseDir) {
    var dataStr = '';
    req.on('data', function(chunk) {
      dataStr += chunk;
    });
    req.on('end', function() {
      var incoming = JSON.parse(dataStr);
      console.log(incoming);
      postData = {
        audience: 'http://libredocs.org',
        assertion: incoming.assertion
      };
      console.log(postData);
      browseridVerify(postData, function(err, r) {
        if(err) {
          res.writeHead(200, {'Content-type': 'application/json'});
          res.write(JSON.stringify(err));
          res.end();
        } else {
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
    });
  }

  return {
    serve: serve
  };
})();
