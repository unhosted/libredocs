exports.handler = (function() {
  var url = require('url'),
    querystring = require('querystring'),
    browseridVerify = require('browserid-verifier');
   
  function serve(req, res, baseDir) {
    var dataStr = '';
    req.on('data', function(chunk) {
      dataStr += chunk;
    });
    req.on('end', function() {
      postData = querystring.parse(dataStr);
      //if(!postData.audience) {
      //  postData.audience = 'http://myfavouritesandwich.org';
      //}
      browseridVerify(postData, function(err, r) {
        if(err) {
          res.writeHead(200, {'Content-type': 'application/json'});
          res.write(JSON.stringify(err));
          res.end();
        } else {
          res.writeHead(200, {'Content-type': 'application/json'});
          res.write(JSON.stringify(r));
          res.end();
        }
      });
    });
  }

  return {
    serve: serve
  };
})();
