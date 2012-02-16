
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
    var backHost = pathParts[3];
    var backPath = '/'+pathParts.splice(4).join('/');
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

    /////////////////////////////////////////////
   // webfinger + CouchDB init + oauth dialog //
  /////////////////////////////////////////////


  function str2sha(str) {
    var shasum = crypto.createHash('sha1');
    shasum.update(str);
    return shasum.digest('hex');
  } 
  function randStr(length) {
    var buffer = new Buffer(length);
    var fd = fs.openSync('/dev/urandom', 'r');
    fs.readSync(fd, buffer, 0, buffer.length, 0);
    fs.closeSync(fd);
    var randStr = buffer.toString('base64');
    console.log('generated randStr of length '+randStr.length+' ('+length+'):'+randStr);
    return randStr;
  }
  function genUser(clientId, conn, cb) {
    console.log('Generating pwd');
    var pwd=randStr(40);
    console.log(pwd);
    console.log('Generating salt');
    var salt=randStr(40);
    console.log(salt);
    console.log('Generating sha');
    var sha1 = str2sha(pwd+salt);
    console.log(sha1);
    console.log('will now add CouchDB user "'+clientId+'"');
    conn.database('_users').save('org.couchdb.user:'+clientId, {
      type: 'user',
      name: clientId,
      roles: [],
      password_sha: sha1,
      salt: salt
    }, function (err, res) {
      console.log('err of adding user:');
      console.log(err);
      console.log('res of adding user:');
      console.log(res); // True
      cb(pwd);
    });
  }
  function createScope(couchAddress, userName, password, clientId, dataScope, public, cb) {
    console.log('connecting to host '+couchAddress);
    var conn = new(cradle.Connection)(couchAddress, config.back.CouchDB.port, {
      cache: true, raw: false,
      auth: {username: userName, password: password}
    });
    var dbName, sec;
    if(public) {
      dbName = dataScope.replace('.', '_');
      sec= {admins:{names:[clientId]}};//leaving readers undefined
    } else {
      dbName = dataScope.replace('.', '_');
      sec= {admins:{names:[clientId]}, readers:{names:[clientId]}};
    }
    var scopeDb = conn.database(dbName);
    scopeDb.exists(function(err, exists) {
      console.log('looking for '+dbName+':');
      console.log(err);
      console.log(exists);
      if(err) {
        console.log('error looking for scopeDb:"'+dbName+'"');
        console.log(err);
      } else if(exists) {
        console.log('database "'+dbName+'" exists already!');
      } else {
      	console.log('creating database "'+dbName+'"');
        scopeDb.create();//looking at https://github.com/cloudhead/cradle this seems to be a synchronous call?
        console.log('created database "'+dbName+'"');
      }
      
      console.log('adding users to database "'+dbName+'":');
      console.log(sec);
      scopeDb.save('_security', sec, function (err, res) {
        console.log('result of saving security doc:');
        console.log(sec);
        console.log('err:');
        console.log(err);
        console.log('res:');
        console.log(res);
        if(err) {
          console.log('there was an error');
        } else {
          console.log('db and security doc created, will now generate user:');
          genUser(clientId, conn, cb);
        }
      });
    });
  }

  function createToken(couchAddress, userName, password, clientId, dataScope, cb) {
    var public = (dataScope == 'public');
    createScope(couchAddress, userName, password, clientId, dataScope, public, function(password) {
      //make basic auth header match bearer token for easy proxying:
      var bearerToken = (new Buffer(clientId+':'+password)).toString('base64');
      console.log('bearerToken ('+bearerToken.length+'):'+bearerToken);
      console.log('clientId ('+clientId.length+'): '+clientId);
      console.log('password ('+password.length+'):'+password);
      cb(bearerToken);
    });
  }
  function setAdminPwd(couchAddress, userName, password, cb) {
    console.log('connecting to '+couchAddress+':'+config.back.CouchDB.port);
    var conn = new(cradle.Connection)(couchAddress, config.back.CouchDB.port, {
    //console.log('connecting to '+couchAddress+':80');
    //var conn = new(cradle.Connection)(couchAddress, 80, {
      cache: true, raw: false
    });
    var configDb = conn.database('_config/admins');//note that cradle allows slashes in db names but not in doc names!
    console.log('setting _config/admins/'+userName+' to '+password);
    configDb.save(userName, password, function(err, res) {
      console.log('err:');
      console.log(err);
      console.log('res:');
      console.log(res);
      cb();
    });
  }
  function serveHostMeta(req, res) {
    res.writeHead(200, {
      'Content-Type': 'xrd+xml',
      'Access-Control-Allow-Origin': '*'});
    res.end('<?xml version="1.0" encoding="UTF-8"?>\n'
      +'<XRD xmlns="http://docs.oasis-open.org/ns/xri/xrd-1.0" xmlns:hm="http://host-meta.net/xrd/1.0">\n'
      +'  <hm:Host xmlns="http://host-meta.net/xrd/1.0">'+config.facadeHost+'</hm:Host>\n'
      +'  <Link rel="lrdd" template="http://'+config.facadeHost+'/webfinger?q={uri}">\n'
      +'  </Link>\n'
      +'</XRD>\n');
  }
  function serveLrdd(req, res) {
    res.writeHead(200, {
      'Content-Type': 'xrd+xml',
      'Access-Control-Allow-Origin': '*'});
    res.end('<?xml version="1.0" encoding="UTF-8"?>\n'
      +'<XRD xmlns="http://docs.oasis-open.org/ns/xri/xrd-1.0" xmlns:hm="http://host-meta.net/xrd/1.0">\n'
      +'  <hm:Host xmlns="http://host-meta.net/xrd/1.0">'+config.facadeHost+'</hm:Host>\n'
      //+'  <Link rel="http://w3.org/ns/remoteStorage"\n'
      +'  <Link rel="remoteStorage"\n'
      +'    template="http://'+config.proxyHost+'/{category}/"\n'
      +'    auth="http://'+config.facadeHost+'/auth"\n'
      +'    api="CouchDB"\n'
      +'  ></Link>\n'
      +'</XRD>\n');
  }
  function serveRegister(req, res) {
    var urlObj = url.parse(req.url, true);
    console.log(urlObj);
    var pathNameParts = urlObj.pathname.split('/');
    //var userName = pathNameParts[3];
    //var couchAddress = pathNameParts.splice(4).join('/');
    var userName = urlObj.query.userName;
    var couchAddress = pathNameParts.splice(3).join('/');
    console.log('registering admin "'+userName+'" for '+couchAddress);
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>CouchDB password-setter proxy</title>\n'
      +'</head><body>This proxy helps you create an "'+userName+'" user on '+couchAddress+' and set a password for it. If you prefer, you can also do this on\n'
      +'<a href="http://'+couchAddress+':5984/_utils">http://'+couchAddress+':5984/_utils</a>.\n'
      +'<form method="POST" action="/CouchDB/doRegister">\n'
      +'  Pick a password: <input type="password" name="pwd1">\n'
      +'  Repeat: <input type="password" name="pwd2">\n'
      +'  <input type="submit" value="this will give an error, but it works">\n'
      +'  <input type="hidden" name="userName" value="'+userName+'">\n'
      +'  <input type="hidden" name="couchAddress" value="'+couchAddress+'">\n'
      +'  <input type="hidden" name="redirect_uri" value="'+urlObj.query.redirect_uri+'"><br>\n'
      +'</form></body></html>');
  }
  function serveDoRegister(req, res) {
    var urlObj = url.parse(req.url, true);
    console.log(urlObj);
    var postData = '';
    req.on('data', function(chunk) {
      postData += chunk;
    });
    req.on('end', function() {
      console.log(postData);
      var query = querystring.parse(postData);
      if(query.pwd1==query.pwd2) {
        console.log('setAdminPwd("'+query.couchAddress+'", "'+query.userName+'", "'+query.pwd1+'", function() ...');
        setAdminPwd(query.couchAddress, query.userName, query.pwd1, function() {
          res.writeHead(302, {Location: query.redirect_uri});
          res.end('Found');
        });
      } else {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>CouchDB passwords differ</title>\n'
        +'</head><body>Please enter the same password twice. <a href="/CouchDB/register/'
        +query.couchAddress+'?redirect_uri='
        +query.redirect_uri+'">try again</a>.\n'
        +'</body></html>');
      }
    });
  }
  function serveAuth(req, res) {
    var urlObj = url.parse(req.url, true);
    var couchAndUser = urlObj.pathname.substring('/CouchDB/auth/'.length).split('/');
    var couchAddress = couchAndUser[0];
    var couchUser = couchAndUser[1];
    console.log(urlObj);
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('<html><form method="POST" action="/CouchDB/doAuth">\n'
      +'  If this is the first time you use '+couchAddress+' then click <a href="http://yourremotestorage.net/CouchDB/register/'+couchAddress+'?userName='+couchUser+'&redirect_uri='
      +'http://yourremotestorage.net/CouchDB/auth/'+couchAddress+'/'+couchUser+'">'
      +'here</a> to initialize it. Otherwise, enter your credentials below:<br>\n'
      +'  You user: <input name="userName" value="'+couchUser+'"><br>\n'
      +'  Your password:<input name="password" type="password" value=""><br>\n'
      +'  <input type="hidden" name="redirect_uri" value="'+urlObj.query.redirect_uri+'">\n'
      +'  <input type="hidden" name="couchAddress" value="'+couchAddress+'">\n'
      +'  <input type="hidden" name="scope" value="'+urlObj.query.scope+'">\n'
      +'  <input type="submit" value="Allow this app to read and write on your couch"><br>\n'
      +'  <a target="_blank" href="http://github.com/unhosted/yourremotestorage/">If you have your own server or domain, host this proxy yourself!</a><br>\n'
      +'</form></html>\n');
  }
  function serveDoAuth(req, res) {
    var urlObj = url.parse(req.url, true);
    var postData = '';
    req.on('data', function(chunk) {
      postData += chunk;
    });
    req.on('end', function() {
      var query = querystring.parse(postData);
      console.log(urlObj);
      console.log(query);
      var clientId = '';//don't trust the clientId that the RP claims - instead, derive it from redirect_uri:
      console.log('Basing clientId on redirect_uri of length '+query.redirect_uri.length);
      for(var i=0; i<query.redirect_uri.length; i++) {
        var thisChar = query.redirect_uri[i];
        if((thisChar >= 'a' && thisChar <= 'z') || (thisChar >= 'A' && thisChar <= 'Z')) {
          clientId += thisChar;
        } else {
          clientId += '_';//thisChar;
        }
      }
      console.log('Parsed redirect_uri to form clientId:'+clientId);
      createToken(query.couchAddress, query.userName, query.password, clientId, query.scope, function(token) {
        res.writeHead(302, {Location: query.redirect_uri+'#access_token='+encodeURIComponent(token)});
        res.end('Found');
      });
    });
  }
  function serve(req, res) {
    console.log('checking url '+req.url.substring(0, '/register'.length));
    console.log('LOG:incoming '+req.method);
    if(req.url=='/.well-known/host-meta') {
      serveHostMeta(req, res);
    } else if(req.url.substring(0, '/webfinger'.length)=='/webfinger') {
      serveLrdd(req, res);
    } else if(req.url.substring(0, '/CouchDB/register'.length)=='/CouchDB/register') {
      serveRegister(req, res);
      } else if(req.url.substring(0, '/CouchDB/doRegister'.length)=='/CouchDB/doRegister') {
      serveDoRegister(req, res);
    } else if(req.url.substring(0, '/CouchDB/auth'.length)=='/CouchDB/auth') {
      serveAuth(req, res);
    } else if(req.url.substring(0, '/CouchDB/doAuth'.length)=='/CouchDB/doAuth') {
      serveDoAuth(req, res);
    } else if(req.url.substring(0, '/CouchDB/proxy'.length)=='/CouchDB/proxy') {
      serveProxy(req, res);
    } else {
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.end('Not found\n');
    }
    console.log('exit sync call to serve');
  }

  return {
    serve: serve
  };
})();
