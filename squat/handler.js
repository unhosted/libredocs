exports.handler = (function() {
  var url = require('url'),
    https = require('https'),
    querystring = require('querystring'),
    browseridVerify = require('browserid-verifier');

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
      checkToken(incoming.userAddress, incoming.token, function() {
        var options = {
          host: incoming.host,
          port: 443,
          path: '/_config/admins/'+incoming.usr,
          method: 'PUT',
          headers: {
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

        var data = JSON.stringify(incoming.pwd);
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
