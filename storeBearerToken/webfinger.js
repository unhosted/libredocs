//based on https://github.com/banksean/node-webfinger
//TODO: handle JSON
exports.webfinger = (function() {
  var http = require('http'),
    https = require('https'),
    url = require('url'),
    xrd = require('./xrd'),
    uriTemplate = require('./uri-template');

  function fetchXrd(urlStr, cb) {
    var urlObj = url.parse(urlStr);
    
    var options = {
      host: urlObj.hostname,
      port: urlObj.port,
      method: 'GET',
      path:urlObj.pathname + (urlObj.search || ''),
      headers: {
        'host': urlObj.hostname
      }
    };
    var request, lib;
    if(urlObj.protocol=='http:') {
      lib = http;
      options.port = options.port || 80;
    } else if(urlObj.protocol=='https:') {
      lib = https;
      options.port = options.port || 443;
    } else {
      cb('unknown protocol '+urlObj.protocol, '');
      return;
    }
    console.log(options);
    request = lib.request(options, function(response) {
      if (response.statusCode == 301 || response.statusCode == 302) {
        console.log('redirecting...');
        fetchXrd(response.headers['location'], cb);
        return;
      }
      //response.setBodyEncoding('utf8');
      var body = '';
      response.on('data', function (chunk) {
        console.log('DATA:'+chunk);
        body += chunk;
      });
      response.on('end', function() {
        console.log('END; parsing...');
        var xrdParser = new xrd.XRDParser(false);
        xrdParser.parse(body,
          function(xrdObj) {
            console.log(xrdObj);
            cb(xrdObj);
           });
      });
    });
    request.on('error', function(e) {
      console.log('problem with request: ' + e.message);
    });
    console.log('sending...');
    request.end();
  };

  function fetchHostMeta(host, cb) {
    fetchXrd('http://' + host + '/.well-known/host-meta', cb);
  }

  function lookup(userUri, cb) {
    var hostName = userUri.split("@")[1];
    fetchHostMeta(hostName, function(err, xrdObj) {
      if(err) {
        cb(err);
      } else {
        console.log(xrdObj);
        var lrddTemplates = xrdObj.getLinksByRel("lrdd");
        var lrddTemplateStr = lrddTemplates[0].getAttrValues('template')[0];
        var lrddTemplate = new uriTemplate.UriTemplate(lrddTemplateStr);
        var urlStr = lrddTemplate.expand({uri:userUri});
        console.log("webfinger uri: " + urlStr);
        fetchXrd(urlStr, function(err, xrdObj) {
          callback(err, xrdObj);
        });
      }
    });
  };
  return {
    lookup: lookup
  };
})();
