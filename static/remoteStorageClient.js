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
          sessionObj.storageAddress = webfinger.resolveTemplate(attr.template, 'documents');
          sessionObj.storageApi = attr.api;
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      });
    }
  }
  function doSignIn(audience, assertion) {
    var xhr=new XMLHttpRequest();
    xhr.open('POST', 'http://libredocs.org/users', true);
    xhr.onreadystatechange = function() {
      if(xhr.readyState == 4) {
        var sessionObj = {};
        try {
          sessionObj = JSON.parse(xhr.responseText);
        } catch(e) {
        }
        if(sessionObj.ok) {
          //this happens if we have a UserAddress record stored (for webfingerless user addresses)
          if(audience=='http://libredocs.org') {//then the bearerToken is also directly stored in there
            sessionObj.state = 'pulling';
          } else {
            sessionObj.state = 'allowRemoteStorage';
          }
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
      audience: audience,
      assertion: assertion
    }));
  }
  function selfAccess1(sessionObj, cb) {
    pimper.createUser(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, 'http___libredocs_org', function(newPass) {
      cb(newPass);
    });
  }
  function selfAccess2(sessionObj, cb) {
    pimper.createDb(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, 'documents', function() {
      cb();
    });
  }
  function selfAccess3(sessionObj, cb) {
    pimper.giveAccess(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, 'documents', 'http___libredocs_org', false, function() {
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
        doSignIn(sessionObj.audience, sessionObj.assertion);
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
          background: 'pending 1/15'
        });
      } else if(sessionObj.state == 'agree') {
        document.getElementById("3").style.display='none';
        displayLogin({
          userAddress: sessionObj.userAddress,
          background: 'pending 2/15'
        });
        enroll(sessionObj);
      } else if(sessionObj.state == 'pinging') {
        ping(sessionObj.subdomain, sessionObj.proxy, 0, function() {
          sessionObj.state = 'squatting1';
          displayLogin({
            userAddress: sessionObj.userAddress,
            background: 'pending 3a/15'
          });
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      } else if(sessionObj.state == 'squatting1') {
        pimper.createAdminUser1(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, function() {
          sessionObj.state = 'squatting2';
          displayLogin({
            userAddress: sessionObj.userAddress,
            background: 'pending 3b/15'
          });
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      } else if(sessionObj.state == 'squatting2') {
        pimper.createAdminUser2(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, function() {
          sessionObj.state = 'createDb';
          displayLogin({
            userAddress: sessionObj.userAddress,
            background: 'pending 4/15'
          });
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      } else if(sessionObj.state == 'createDb') {
        pimper.createDb(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, 'cors', function() {
          sessionObj.state = 'pop1';
          displayLogin({
            userAddress: sessionObj.userAddress,
            background: 'pending 5/15'
          });
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      } else if(sessionObj.state == 'pop1') {
        pimper.pop1(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, sessionObj.proxy, function() {
          sessionObj.state = 'pop2';
          displayLogin({
            userAddress: sessionObj.userAddress,
            background: 'pending 6/15'
          });
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      } else if(sessionObj.state == 'pop2') {
        pimper.pop2(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, sessionObj.proxy, function() {
          sessionObj.state = 'pop3';
          displayLogin({
            userAddress: sessionObj.userAddress,
            background: 'pending 7/15'
          });
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      } else if(sessionObj.state == 'pop3') {
        pimper.pop3(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, sessionObj.proxy, function() {
          sessionObj.state = 'pop4';
          displayLogin({
            userAddress: sessionObj.userAddress,
            background: 'pending 9/15'
          });
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      } else if(sessionObj.state == 'pop4') {
        pimper.pop4(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, sessionObj.proxy, function() {
          sessionObj.state = 'pop5';
          displayLogin({
            userAddress: sessionObj.userAddress,
            background: 'pending 10/15'
          });
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      } else if(sessionObj.state == 'pop5') {
        pimper.pop5(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, sessionObj.proxy, function() {
          sessionObj.state = 'selfAccess1';
          displayLogin({
            userAddress: sessionObj.userAddress,
            background: 'pending 11/15'
          });
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      } else if(sessionObj.state == 'selfAccess1') {
        selfAccess1(sessionObj, function(token) {
          sessionObj.bearerToken = token;
          sessionObj.storageApi = 'CouchDB';
          sessionObj.storageAddress = 'http://'+sessionObj.proxy+'/'+sessionObj.subdomain + '.iriscouch.com/documents/';
          sessionObj.state = 'selfAccess2';
          displayLogin({
            userAddress: sessionObj.userAddress,
            background: 'pending 12/15'
          });
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      } else if(sessionObj.state == 'selfAccess2') {
        selfAccess2(sessionObj, function() {
          sessionObj.state = 'selfAccess3';
          displayLogin({
            userAddress: sessionObj.userAddress,
            background: 'pending 13/15'
          });
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      } else if(sessionObj.state == 'selfAccess3') {
        selfAccess3(sessionObj, function() {
          sessionObj.state = 'storing';
          displayLogin({
            userAddress: sessionObj.userAddress,
            background: 'pending 14/15'
          });
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          checkForLogin();
        });
      } else if(sessionObj.state == 'storing') {
        store(sessionObj, function() {
          sessionObj.state = 'pulling';
          displayLogin({
            userAddress: sessionObj.userAddress,
            background: 'pending 15/15'
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
          sessionObj.bearerToken = token;
          sessionObj.storageAddress = 'http://'+sessionObj.proxy+'/'+sessionObj.subdomain + '.iriscouch.com/documents/';
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
  function signIn(audience, assertion) {
    localStorage.setItem('sessionObj', JSON.stringify({
      state: 'signIn',
      audience: audience,
      assertion: assertion
    }));
  }
  function logout() {
    localStorage.clear();
    window.location = '/';
  }
  return {
    on: on,
    signIn: signIn,
    checkForLogin: checkForLogin,
    allow: allow,
    agree: agree,
    logout: logout,
    cancel: logout
  };
})();
