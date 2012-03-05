//TODO: handle JSON
var http = require("http"),
  url = require("url"),
  xrd = require("./xrd"),
  uriTemplate = require('./uri-template');

/**
 * An async webfinger client.
 * For more info on webfinger:
 * http://code.google.com/p/webfinger/
 *
 * Usage:
 *
 * var fingerPromise = wf.finger(userUri);
 * fingerPromise.addCallback(function(xrdObj) {
 *   // do something with the webfinger XRD for this user
 * });
 *
 * Caveat: currently only works with email addresses.
 * 
 * Sean McCullough banksean@gmail.com
 *
 */

var WebFingerClient = function() {};

WebFingerClient.prototype.fetchFingerData_ = function(urlStr, callback) {
  var fingerUrl = url.parse(urlStr);
  var wf = this;
  
  var options = {
    host: fingerUrl.hostname,
    port: fingerUrl.port || 80,
    method: 'GET',
    path:fingerUrl.pathname + fingerUrl.search,
    headers: {
      "host": fingerUrl.hostname
    }
  };
  console.log(options);
  var request = http.request(options, function(response) {
    response.setBodyEncoding("utf8");
    var body = "";
    response.on("data", function (chunk) {
      body += chunk;
    });
    response.on("end", function() {
      var xrdParser = new xrd.XRDParser(false);
      xrdParser.parse(body,
        function(xrdObj) {
          console.log(xrdObj);
          callback(xrdObj);
        });
    });
  });
  request.on('error', function(e) {
    console.log('problem with request: ' + e.message);
  });
  console.log('sending request for lrdd');
  request.end();
};

WebFingerClient.prototype.fetchHostMeta_ = function(host, callback) {
  //TODO: try https first
  return this.fetchHostMetaCookedUrl_("http://" + host + "/.well-known/host-meta", callback)
}

WebFingerClient.prototype.fetchHostMetaCookedUrl_ = function(urlStr, callback) {
  var hostMetaUrl = url.parse(urlStr);
  var wf = this;
  var path = hostMetaUrl.pathname;
  if (hostMetaUrl.search) {
    path += hostMetaUrl.search;
  }
  //TODO: handle https
  var options = {
    host: hostMetaUrl.hostname,
    port: 80,
    method: 'GET',
    path: path,
    headers: {
      "host": hostMetaUrl.hostname
    }
  };
  console.log(options);
  var request = http.request(options, function(response) {
    console.log("status: " + response.statusCode);
    if (response.statusCode == 301 || response.statusCode == 302) {
      // Do a redirect.  Yahoo does this with @yahoo.com addresses
      // but this XRD parser can't grok it yet. 
      console.log('got redirected to: ' + response.headers['location']);
      return wf.fetchHostMetaCookedUrl_(response.headers['location']);
    }
    response.setBodyEncoding("utf8");
    var body = "";
    response.on("data", function (chunk) {
      console.log('got data:'+chunk);
      body += chunk;
    });
    response.on("end", function() {
      console.log('got response:');
      console.log(body);
      var xrdParser = new xrd.XRDParser(false);
      xrdParser.parse(body,
        function(xrdObj) {
          callback(xrdObj);
        });
    });
  });
  request.on('error', function(e) {
    console.log('problem with request: ' + e.message);
  });
  console.log('sending request for host-meta');
  request.end();
};

WebFingerClient.prototype.finger = function(userUri, callback) {
  var wf = this;

  // parse out the hostname from user id. currently only works for email.
  // TODO: see if node's url class can parse email addresses too.
  var hostName = userUri.split("@")[1];
  this.fetchHostMeta_(hostName, 
    function(xrdObj) {
      console.log(xrdObj);
      var webfingerTemplates = xrdObj.getLinksByRel("lrdd");
      var webfingerTemplateStr = webfingerTemplates[0].getAttrValues('template')[0];
      var webfingerTemplate = new uriTemplate.UriTemplate(webfingerTemplateStr);

      var fingerUrl = webfingerTemplate.expand({uri:userUri});
      console.log("webfinger uri: " + fingerUrl);

      wf.fetchFingerData_(fingerUrl,
        function(xrdObj) {
          callback(xrdObj);
        });
    });
};

exports.WebFingerClient = WebFingerClient;
