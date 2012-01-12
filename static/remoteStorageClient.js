var remoteStorageClient = (function() {
  var handlers = {};
  function on(event, handler) {
    handlers[event]=handler;
  }
  function displayLogin(obj) {
    handlers['status'](obj);
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
      if(sessionObj.state == 'signIn') {
        displayLogin({
          background: 'signing you in'
        });
        signIn(sessionObj.assertion);
      } else if(sessionObj.state == 'wf1') {
        displayLogin({
          userAddress: sessionObj.userAddress,
          background: 'checking'
        });
        checkWebfinger(sessionObj);
      } else if(sessionObj.state == 'needed') {
        document.getElementById("3").style.display='block';
        displayLogin({
          userAddress: sessionObj.userAddress,
          background: 'pending 1/12'
        });
      } else if(sessionObj.state == 'agree') {
        document.getElementById("3").style.display='none';
        displayLogin({
          userAddress: sessionObj.userAddress,
          background: 'pending 2/12'
        });
        enroll(sessionObj);
      } else if(sessionObj.state == 'pinging') {
        ping(sessionObj.subdomain, sessionObj.proxy, 0, function() {
          sessionObj.state = 'squatting';
          displayLogin({
            userAddress: sessionObj.userAddress,
            background: 'pending 3/12'
          });
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      } else if(sessionObj.state == 'squatting') {
        pimper.createAdminUser(sessionObj.subdomain+'.iriscouch.com', 'admin', sessionObj.adminPwd, function() {
          sessionObj.state = 'createDb';
          displayLogin({
            userAddress: sessionObj.userAddress,
            background: 'pending 4/12'
          });
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      } else if(sessionObj.state == 'createDb') {
        pimper.createDb(sessionObj.subdomain+'.iriscouch.com', 'admin', sessionObj.adminPwd, 'cors', function() {
          sessionObj.state = 'pop1';
          displayLogin({
            userAddress: sessionObj.userAddress,
            background: 'pending 5/12'
          });
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      } else if(sessionObj.state == 'pop1') {
        pimper.pop1(sessionObj.subdomain+'.iriscouch.com', 'admin', sessionObj.adminPwd, sessionObj.proxy, function() {
          sessionObj.state = 'pop2';
          displayLogin({
            userAddress: sessionObj.userAddress,
            background: 'pending 6/12'
          });
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      } else if(sessionObj.state == 'pop2') {
        pimper.pop2(sessionObj.subdomain+'.iriscouch.com', 'admin', sessionObj.adminPwd, sessionObj.proxy, function() {
          sessionObj.state = 'pop3';
          displayLogin({
            userAddress: sessionObj.userAddress,
            background: 'pending 7/12'
          });
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      } else if(sessionObj.state == 'pop3') {
        pimper.pop3(sessionObj.subdomain+'.iriscouch.com', 'admin', sessionObj.adminPwd, sessionObj.proxy, function() {
          sessionObj.state = 'selfAccess1';
          displayLogin({
            userAddress: sessionObj.userAddress,
            background: 'pending 8/12'
          });
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      } else if(sessionObj.state == 'selfAccess1') {
        selfAccess1(sessionObj, function(token) {
          sessionObj.token = token;
          sessionObj.state = 'selfAccess2';
          displayLogin({
            userAddress: sessionObj.userAddress,
            background: 'pending 9/12'
          });
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      } else if(sessionObj.state == 'selfAccess2') {
        selfAccess2(sessionObj, function(token) {
          sessionObj.token = token;
          sessionObj.state = 'selfAccess3';
          displayLogin({
            userAddress: sessionObj.userAddress,
            background: 'pending 10/12'
          });
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      } else if(sessionObj.state == 'selfAccess3') {
        selfAccess3(sessionObj, function(token) {
          sessionObj.token = token;
          sessionObj.state = 'storing';
          displayLogin({
            userAddress: sessionObj.userAddress,
            background: 'pending 11/11'
          });
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      } else if(sessionObj.state == 'storing') {
        store(sessionObj, function() {
          sessionObj.state = 'pulling';
          displayLogin({
            userAddress: sessionObj.userAddress,
            background: 'pending 12/12'
          });
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      } else if(sessionObj.state == 'connectingBackdoor') {
        displayLogin({
          userAddress: sessionObj.userAddress,
          background: 'connecting',
          buttons: ['logout']

        });
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
        displayLogin({
          userAddress: sessionObj.userAddress,
          buttons: ['allow', 'cancel']
        });
      } else if(sessionObj.state == 'pulling') {
        displayLogin({
          userAddress: sessionObj.userAddress,
          background: 'pulling',
          buttons: ['logout']
        });
        localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
      } else if(sessionObj.state == 'error') {
        displayLogin({
          userAddress: sessionObj.userAddress,
          background: 'error',
          buttons: ['logout']
        });
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
  function logout() {
    localStorage.clear();
    window.location = '/';
  }
  return {
    on: on,
    checkForLogin: checkForLogin,
    allow: allow,
    agree: agree,
    logout: logout
  };
})();
