var remoteStorageClient = (function() {
  function displayLogin(userAddress) {
    document.getElementById('header').innerHTML = 'Libre Docs - '
      + userAddress 
      + ' <input type="submit" value="logout" onclick="localStorage.clear();location=\'\';">';
  }
  function ping(userName, proxy, counter, onSuccess) {
    //for(var i=0; i<=counter; i++) {
    //  document.getElementById('status').innerHTML += '.';
    //}
    pimper.ping(userName, proxy, function(result) {
      if(result=='ok') {
        onSuccess();
      } else if(result='no') {
        console.log('ping '+counter+'...');
        ping(userName, proxy, counter+1, onSuccess);
      } else {
        alert('Error code '+result);
      }
    });
  }
  function getUserNameForIrisCouch(userAddress, userNameTry) {
    return userAddress.replace(/-/g, '--').replace(/@/g, '-at-').replace(/\./g, '-dot-')+(userNameTry?'-'+userNameTry:'');
  }
  function enroll(sessionObj) {
    var userName = getUserNameForIrisCouch(sessionObj.userAddress, sessionObj.userNameTry);
    pimper.provision(userName, sessionObj.firstName, sessionObj.lastName, sessionObj.userAddress, sessionObj.adminPwd, function(result) {
      if(result=='taken') {
        console.log('Username '+userName+' is taken! :( trying a different one');
        //sessionObj.userNameTry = (sessionObj.userNameTry?sessionObj.userNameTry:0)+1;
        sessionObj.userNameTry = (sessionObj.userNameTry?sessionObj.userNameTry:14)+1;//skip straight to higher numbers, so debugging doesn't take that long
        localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
        checkForLogin();
      } else if(result=='ok') {
        sessionObj.state = 'pinging';
        sessionObj.subdomain = userName;
        sessionObj.proxy = 'yourremotestorage.net/CouchDB/proxy/';
        localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
        checkForLogin();
      }
    });
  }
  function getTokenThroughBackdoor(sessionObj, err, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', sessionObj.attr.browseridAccess, true);
    xhr.onreadystatechange = function() {
      if(xhr.readyState == 4) {
        if(xhr.status == 200) {
          cb(xhr.responseText);
        } else {
          err(xhr.responseText);
        }
      }
    }
    xhr.send(JSON.stringify({
      audience: sessionObj.audience,
      assertion: sessionObj.assertion
    }));
  }
  function checkWebfinger(sessionObj) {
    if(sessionObj.state == 'wf1') {
      require(['webfinger'], function(webfinger) {
        webfinger.getAttributes(sessionObj.userAddress, {
          onError: function(code, msg) {
            if(code == 5) {
              sessionObj.state = 'needed';
              localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
              checkForLogin();
            }
          }
        }, function() {}, function(attr) {
          sessionObj.attr = attr;
          if(false){//sessionObj.attr.browseridAccess) {
            sessionObj.state = 'connectingBackdoor';
          } else {
            sessionObj.state = 'allowRemoteStorage';
          }
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      });
    }
  }
  function signIn(assertion) {
    var xhr=new XMLHttpRequest();
    xhr.open('POST', '/users', true);
    xhr.onreadystatechange = function() {
      if(xhr.readyState == 4) {
        var sessionObj = {};
        try {
          sessionObj = JSON.parse(xhr.responseText);
        } catch(e) {
        }
        if(sessionObj.ok) {
          //this happens if we have a UserAddress record stored (for webfingerless user addresses)
          sessionObj.state = 'pulling';
        } else if(sessionObj.userAddress) {
          sessionObj.state = 'wf1';
        } else {
          alert('something went wrong! "'+xhr.responseText+'"['+xhr.status+']');
          localStorage.clear();
          window.location='/';
        }
        localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
        checkForLogin();
      }
    };
    xhr.send(JSON.stringify({
      audience: 'http://libredocs.org',
      assertion: assertion
    }));
  }
  function selfAccess1(sessionObj, cb) {
    pimper.createUser(sessionObj.subdomain+'.iriscouch.com', 'admin', sessionObj.adminPwd, 'http___libredocs_org', function(newPass) {
      cb(newPass);
    });
  }
  function selfAccess2(sessionObj, cb) {
    pimper.createDb(sessionObj.subdomain+'.iriscouch.com', 'admin', sessionObj.adminPwd, 'documents', function() {
      cb();
    });
  }
  function selfAccess3(sessionObj, cb) {
    pimper.giveAccess(sessionObj.subdomain+'.iriscouch.com', 'admin', sessionObj.adminPwd, 'documents', 'http___libredocs_org', false, function() {
      cb();
    });
  }
  function store(sessionObj, cb) {
    sessionObj.action='set';
    sessionObj.ok=true;
    var xhr = new XMLHttpRequest();
    xhr.open('PUT', 'http://libredocs.org/users', true);
    xhr.onreadystatechange = function() {
      if(xhr.readyState == 4) {
        cb();
      }
    };
    xhr.send(JSON.stringify(sessionObj));
  }
  function checkForLogin() {
    var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
    if(sessionObj) {
      displayLogin(sessionObj.userAddress);
      if(sessionObj.state == 'signIn') {
        document.getElementById('header').innerHTML = 'Libre Docs - (signing you in)';
        signIn(sessionObj.assertion);
      } else if(sessionObj.state == 'wf1') {
        document.getElementById('header').innerHTML = 'Libre Docs - '+sessionObj.userAddress+' (checking)';
        checkWebfinger(sessionObj);
      } else if(sessionObj.state == 'needed') {
        document.getElementById("3").style.display='block';
        document.getElementById('header').innerHTML = 'Libre Docs - '+sessionObj.userAddress+' (pending)';
      } else if(sessionObj.state == 'agree') {
        document.getElementById("3").style.display='none';
        document.getElementById('header').innerHTML = 'Libre Docs - '+sessionObj.userAddress+' (pending)';
        enroll(sessionObj);
      } else if(sessionObj.state == 'pinging') {
        ping(sessionObj.subdomain, sessionObj.proxy, 0, function() {
          sessionObj.state = 'squatting';
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      } else if(sessionObj.state == 'squatting') {
        pimper.createAdminUser(sessionObj.subdomain+'.iriscouch.com', 'admin', sessionObj.adminPwd, function() {
          sessionObj.state = 'createDb';
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      } else if(sessionObj.state == 'createDb') {
        pimper.createDb(sessionObj.subdomain+'.iriscouch.com', 'admin', sessionObj.adminPwd, 'cors', function() {
          sessionObj.state = 'pop1';
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      } else if(sessionObj.state == 'pop1') {
        pimper.pop1(sessionObj.subdomain+'.iriscouch.com', 'admin', sessionObj.adminPwd, sessionObj.proxy, function() {
          sessionObj.state = 'pop2';
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      } else if(sessionObj.state == 'pop2') {
        pimper.pop2(sessionObj.subdomain+'.iriscouch.com', 'admin', sessionObj.adminPwd, sessionObj.proxy, function() {
          sessionObj.state = 'pop3';
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      } else if(sessionObj.state == 'pop3') {
        pimper.pop3(sessionObj.subdomain+'.iriscouch.com', 'admin', sessionObj.adminPwd, sessionObj.proxy, function() {
          sessionObj.state = 'selfAccess1';
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      } else if(sessionObj.state == 'selfAccess1') {
        selfAccess1(sessionObj, function(token) {
          sessionObj.token = token;
          sessionObj.state = 'selfAccess2';
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      } else if(sessionObj.state == 'selfAccess2') {
        selfAccess2(sessionObj, function(token) {
          sessionObj.token = token;
          sessionObj.state = 'selfAccess3';
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      } else if(sessionObj.state == 'selfAccess3') {
        selfAccess3(sessionObj, function(token) {
          sessionObj.token = token;
          sessionObj.state = 'storing';
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      } else if(sessionObj.state == 'storing') {
        store(sessionObj, function() {
          sessionObj.state = 'pulling';
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      } else if(sessionObj.state == 'connectingBackdoor') {
        document.getElementById('header').innerHTML = 'Libre Docs - '+sessionObj.userAddress+' (connecting)';
        getTokenThroughBackdoor(sessionObj, function() {
          sessionObj.state = 'error';
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        }, function(token) {
          sessionObj.token = token;
          sessionObj.state = 'pulling';
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      } else if(sessionObj.state == 'allowRemoteStorage') {
        document.getElementById('header').innerHTML = 'Libre Docs - '+sessionObj.userAddress+' <input type="submit" value="Allow remote storage" onclick="remoteStorage.allow();">';
      } else if(sessionObj.state == 'pulling') {
        document.getElementById('header').innerHTML = 'Libre Docs - '+sessionObj.userAddress+' (pulling)';
        localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
      } else if(sessionObj.state == 'error') {
        document.getElementById('header').innerHTML = 'Libre Docs - '+sessionObj.userAddress+' (error)';
        localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
      }
    } else {
      window.location = '/';
    }
  }
  function allow() {
    var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
    window.open(sessionObj.attr.auth+'?redirect_uri=http://libredocs.org/rcvToken.html&scope=documents');
  }
  function agree() {
    var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
    localStorage.setItem('sessionObj', JSON.stringify({
        state: 'agree',
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        adminPwd: sessionObj.adminPwd,//the admin pwd that was generated doubles as provisioning token during provisioning
        userAddress: sessionObj.userAddress
      })
    );
    checkForLogin();
  }
  return {
    checkForLogin: checkForLogin,
    allow: allow,
    agree: agree
  };
})();
