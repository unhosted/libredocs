exports.handler = (function() {
  var url = require('url'),
    https = require('https'),
    querystring = require('querystring'),
    browseridVerify = require('browserid-verifier');

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
      browseridVerify(postData, function(err, r) {
        if(err) {
          res.writeHead(200, {'Content-type': 'application/json'});
          res.write(JSON.stringify(err));
          res.end();
        } else {
          if(r.email) {
            console.log(r.email+' confirmed by browserid verifier');
            var options = {
              host: incoming.host,
              port: 443,
              path: '/'+incoming.dbName+'/',
              method: 'PUT',
              headers: {
                'Authorization': req.headers.authorization,
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
