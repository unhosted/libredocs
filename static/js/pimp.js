var pimper = (function() {
  var content = {};
  function httpPut(address, value, auth, contentType, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('PUT', address, true);
    if(auth) {
      xhr.withCredentials=true;
      xhr.setRequestHeader('Authorization', 'Basic '+Base64.encode(auth.usr+':'+auth.pwd));
    }
    if(contentType) {
      xhr.setRequestHeader('Content-Type', contentType);
    }
    xhr.onreadystatechange = function() {
      if(xhr.readyState == 4) {
        cb(xhr.status);
      }
    }
    if(value) {
      xhr.send(value);
    } else {
      xhr.send();
    }
  }
  function createAdminUser1(hostToSquat, adminUsr, adminPwd, cb) {
    var putHost = 'http://proxy.'+location.host+'/'+hostToSquat+'/_users/org.couchdb.user:'+adminUsr;
    var userObj = genUser(adminUsr, adminPwd);
    userObj.browserid=true;
    userObj.roles=['admin', 'browserid'];
    httpPut(putHost, JSON.stringify(userObj), null, null, cb);
  }
  function createAdminUser2(hostToSquat, adminUsr, adminPwd, cb) {
    httpPut('/squat', JSON.stringify({
      host: hostToSquat,
      usr: adminUsr,
      pwd: adminPwd
    }), null, null, cb);
  }
  function createDb(hostToSquat, adminUsr, adminPwd, dbName, cb) {
    httpPut('/createDb', JSON.stringify({
      host: hostToSquat,
      dbName: dbName,
      usr: adminUsr,
      pwd: adminPwd
    }), null, null, cb);
  }
  function setConfig(hostToSquat, adminUsr, adminPwd, section, key, value, cb) {
    httpPut('/setConfig', JSON.stringify({
      host: hostToSquat,
      section: section,
      key: key,
      value: value,
      usr: adminUsr,
      pwd: adminPwd
    }), null, null, cb);
  }
  function genToken(clientId, password) {
    return Base64.encode(clientId+':'+password);
  }
  function randStr(length) {
    var buffer = '';
    while(buffer.length < length) {
      buffer += Math.random().toString(36).substring(2);
    }
    return buffer.substring(0, length);
  }
  function genUser(userName, pwd) {
    var salt=randStr(40);
    return {
      type: 'user',
      name: userName,
      roles: [],
      password_sha: SHA1(pwd+salt),
      salt: salt
    };
  }
  function couchPut(couchAddress, masterUser, masterPass, dbName, key, value, cb) {
    var putHost = 'http://proxy.'+location.host+'/'+couchAddress;
    var authStr = {
      usr:masterUser,
      pwd:masterPass
    };
    httpPut(putHost+'/'+dbName+'/'+key, JSON.stringify(value), authStr, undefined, cb);
  }
  function createUser(couchAddress, masterUser, masterPass, newUser, cb) {
    var newPass = randStr(40);
    var userObj = genUser(newUser, newPass);
    couchPut(couchAddress, masterUser, masterPass, '_users', 'org.couchdb.user:'+newUser, userObj, function(result) {
      cb(result, Base64.encode(newUser+':'+newPass));
    });
  }
  function createDocument(couchAddress, dbName, docName, authStr, value, cb) {
    httpPut(couchAddress+'/'+dbName+'/'+docName, value, authStr, undefined, cb);
  }
  function uploadAttachment(couchAddress, dbName, docName, authStr, attachmentName, fileName, contentType, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', fileName, true);
    xhr.onreadystatechange = function() {
      if(xhr.readyState == 4) {
        if(xhr.status == 200) {
          httpPut(couchAddress+'/'+dbName+'/'+docName+'/'+attachmentName, xhr.responseText, authStr, contentType, cb);
        } else {
          alert('failed to retrieve '+fileName);
          cb('error');
        }
      }
    };
    xhr.send();
  }
  function giveAccess(couchAddress, masterUser, masterPass, dbName, userName, isPublic, cb) {
    var sec;
    if(isPublic) {
      sec = {
        admins: {names:[userName]}
      };
    } else {
      sec = {
        admins: {names:[userName]},
        readers: {names:[userName]}
      };
    }
    couchPut(couchAddress, masterUser, masterPass, dbName, '_security', sec, cb);
  }
  
  function provision(userName, firstName, lastName, userAddress, token, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('PUT', '/provision', true);
    xhr.onreadystatechange= function() {
      if(xhr.readyState == 4) {
        cb(xhr.status);
      }
    };
    var data = JSON.stringify({
      userName: userName,
      firstName: firstName,
      lastName: lastName,
      userAddress: userAddress,
      token: token
    });
    xhr.send(data);
  }
  function ping(couchHost, proxy, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'http://'+proxy+couchHost, true);
    xhr.onreadystatechange= function() {
      if(xhr.readyState == 4) {
        cb(xhr.status);
      }
    };
    xhr.send();
  }

  return {
    provision: provision,
    createDocument: createDocument,
    uploadAttachment: uploadAttachment,
    ping: ping,
    createDb: createDb,
    setConfig: setConfig,
    createAdminUser1: createAdminUser1,
    createAdminUser2: createAdminUser2,
    createUser: createUser,
    giveAccess: giveAccess
  };
})();

var options;
if(window) {
  //we're in the browser
} else if(process && process.argv && process.argv.length >= 5 ) {
  options = process.argv.splice(2);
  pimper.pimp(options[0], options[1], options[2]);
} else if(process.argv) {
  console.log('use as: node pimp.js {user}@{domain} {password} {proxy.libredocs.org/}');
  console.log('E.g.: node pimp.js me@michiel.iriscouch.com asdf proxy.libredocs.org/');
}
