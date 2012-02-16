
exports.handler = (function() {
  var http = require('http'),
    cradle = require('cradle'),
    fs = require('fs'),
    Buffer = require('buffer').Buffer,
    crypto = require('crypto'),
    url = require('url'),
    querystring = require('querystring'),
    config = require('./config').config;

      ////////////////
     // CORS proxy //
    ////////////////


  function optionsServe(req, res, dataStr) {
    console.log('serving options');
    var responseHeaders={}//should maybe get a base set from remote?
    var origin = req.headers.Origin;
    if(!origin) {
      origin = req.headers.origin;
      if(!origin) {
        console.log('no Origin header found!');
        console.log(req.headers);
        origin = '*';
      }
    }
    responseHeaders['Access-Control-Allow-Origin'] = origin;
    responseHeaders['Access-Control-Allow-Methods'] = 'GET, PUT, POST, DELETE';
    responseHeaders['Access-Control-Allow-Headers'] = 'authorization,content-type,Content-Length,gdata-version,slug,x-upload-content-length,x-upload-content-type';
    responseHeaders['Access-Control-Allow-Credentials'] = 'true';
    res.writeHead(200, responseHeaders);
    res.end();
    console.log('exit serving options');
  }
  function onReturn(res2, req, res) {
    console.log('LOG: got reply status '+res2.statusCode);
    console.log('onReturn');
    var responseHeaders = res2.headers;
    console.log('\nC.HEADERS:'+JSON.stringify(responseHeaders));
    var origin = req.headers.Origin;
    if(!origin) {
      origin = req.headers.origin;
      if(!origin) {
        console.log('no Origin header found!');
        origin = '*';
      }
    }
    responseHeaders['Access-Control-Allow-Origin'] = origin;
    responseHeaders['Access-Control-Allow-Methods'] = 'GET, PUT, POST, DELETE';
    responseHeaders['Access-Control-Allow-Headers'] = 'authorization,content-type,Content-Length,gdata-version,slug,x-upload-content-length,x-upload-content-type';
    responseHeaders['Access-Control-Allow-Credentials'] = 'true';
    res.writeHead(res2.statusCode, responseHeaders);
    res2.setEncoding('utf8');
    var res2Data = '';
    res2.on('data', function (chunk) {
      console.log('onReturn: res2,on(data)');
      res2Data += chunk;
      console.log('exit onReturn: res2,on(data)');
    });
    res2.on('end', function() {
      console.log('onReturn: res2,on(end)');
      console.log('\nC.DATA:'+res2Data);
      res.write(res2Data);
      res.end();
      console.log('exit onReturn: res2,on(end)');
    });
  }
  function throughServe(req, res, backHost, backPath, backPort, options, dataStr) {
    console.log('throughServe(req, res, '+backHost+', '+backPath+', '+backPort+', options);');
    //stop the remote server getting confused trying to serve a vhost for the proxy's url instead of its own one:
    options.headers.host = options.host;

    //cunning trick that works because of how our bearer tokens relate to our CouchDb passwords:
    if(options.headers['authorization']) {
      var token;
      if(options.headers['authorization'].substring(0, ('Basic '.length)) == 'Basic ') {
        token = options.headers['authorization'].substring(('Basic '.length));
      } else{
        token = options.headers['authorization'].substring(('Bearer '.length));
      }
      options.headers['authorization'] = 'Basic '+token;
    }
    if(options.headers['Authorization']) {
      var token;
      if(options.headers['Authorization'].substring(0, ('Basic '.length)) == 'Basic ') {
        token = options.headers['Authorization'].substring(('Basic '.length));
      } else{
        token = options.headers['Authorization'].substring(('Bearer '.length));
      }
      options.headers['Authorization'] = 'Basic '+token;
    }

    console.log('\nB.OPTIONS:'+JSON.stringify(options));
    
    var req2 = http.request(options, function(res2) {
      onReturn(res2, req, res);
    });

    //console.log('example.DATA:'+JSON.stringify({ingredients:['bacon', 'cheese']}));
    console.log('B.DATA:'+dataStr);
    req2.write(dataStr);
    req2.end();
    console.log('exit throughServe');
  }
  function serveProxy(req, res) {
    console.log('serveProxy');
    var urlObj = url.parse(req.url, true);
    var pathParts = urlObj.pathname.split('/');
    var backHost = pathParts[1];
    var backPath = '/'+pathParts.splice(2).join('/');
    var backPort = 5984;
    console.log('backend: "'+backHost+'", "'+backPath+'", '+backPort);
    var dataStr = '';
    req.on('data', function(chunk) {
      console.log('serveProxy: on(data)');
      dataStr += chunk;
      console.log('A:'+chunk);
      console.log('exit serveProxy: on(data)');
    });
    req.on('end', function() {
      console.log('serveProxy: on(end)');
      console.log('A:END');
      var options = {
        'host': backHost,
        'port': backPort,
        'method': req.method,
        'path': backPath,
        'headers': req.headers
      };
      if(req.method=='OPTIONS') {
        optionsServe(req, res, dataStr);
      } else {
        throughServe(req, res, backHost, backPath, backPort, options, dataStr);
      }
      console.log('exit serveProxy: on(end)');
    });
    console.log('exit serveProxy');
  }

  function serve(req, res) {
    serveProxy(req, res);
    console.log('exit sync call to serve');
  }

  return {
    serve: serve
  };
})();
