exports.handler = (function() {
  var url = require('url'),
    https = require('https'),
    querystring = require('querystring'),
    irisCouchProvisioning = require('./config').irisCouchProvisioning;
  function checkToken(userAddress, token, cb) {
    cb();
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
        assertion: incoming.browserIdAssertion
      };
      console.log(postData);
      checkToken(incoming.userAddres, incoming.token, function(err, r) {
        var authStr = irisCouchProvisioning.usr + ':' + irisCouchProvisioning.pwd;
        console.log(authStr);
        var options = {
          host: irisCouchProvisioning.host,
          port: 443,
          path: irisCouchProvisioning.path,
          method: 'POST', 
          headers: {
            'Authorization': 'Basic ' + new Buffer(authStr).toString('base64'),
            'Content-Type': 'application/json'
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
            console.log('END');
            res.writeHead(response.statusCode, response.headers);
            res.write(resStr);
            res.end();
          });
        });
        console.log('writing to the request');

        var data = JSON.stringify({
          _id: 'Server/'+incoming.userName,
          partner: 'unhosted',
          creation: {
            first_name: incoming.firstName,
            last_name: incoming.lastName,
            email: incoming.userAddress,
            subdomain: incoming.userName
          }
        });
        console.log(data);
        request.write(data);
        console.log('ending the request');
        request.end();
        console.log('setting request.on(\'response\', ...)');
      });
    });
  }

  return {
    serve: serve
  };
})();
