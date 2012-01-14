var remoteStorageClient = (function() {
  var sessionStates = {
    signIn: { page: '/loggedIn.html', display:'signing you in', action: doSignIn},
    wf1: { page: '/loggedIn.html', display:'checking', action: checkWebfinger},
    needed: { page: '/loggedIn.html', display:'pending 1/15', displayBlock:'3'},
    agree: { page: '/loggedIn.html', display:'pending 2/15', displayNone:'3', action: enroll},
    pinging: { page: '/loggedIn.html', display:'pending 3/15', action: doPing},
    squatting1: { page: '/loggedIn.html', display:'pending 4/15', action: doSquat1},
    squatting2: { page: '/loggedIn.html', display:'pending 5/15', action: doSquat2},
    createDb: { page: '/loggedIn.html', display:'pending 6/15', action: createDb},
    pop1: { page: '/loggedIn.html', display:'pending 7/15', action: pop1},
    pop2: { page: '/loggedIn.html', display:'pending 8/15', action: pop2},
    pop3: { page: '/loggedIn.html', display:'pending 9/15', action: pop3},
    pop4: { page: '/loggedIn.html', display:'pending 10/15', action: pop4},
    pop5: { page: '/loggedIn.html', display:'pending 11/15', action: pop5},
    selfAccess1: { page: '/loggedIn.html', display:'pending 12/15', action: doSelfAccess1},
    selfAccess2: { page: '/loggedIn.html', display:'pending 13/15', action: doSelfAccess2},
    selfAccess3: { page: '/loggedIn.html', display:'pending 14/15', action: doSelfAccess3},
    storing: { page: '/loggedIn.html', display:'pending 15/15', action: doStore},
    connectingBackdoor: { page: '/loggedIn.html', display:'connecting', buttons:['logout'], action: connectBackdoor},
    allowRemoteStorage: { page: '/loggedIn.html', buttons:['allow', 'cancel']},
    pulling: { page: '/loggedIn.html', display:'pulling', buttons:['logout'], action: pull},
    error: { page: '/loggedIn.html', display:'error', buttons:['logout']}
  };
  function checkForLogin() {
    var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
    if(sessionObj) {
      if(sessionStates[sessionObj.state]) {
        var fsmInfo = sessionStates[sessionObj.state];
        if(window.location.pathname != fsmInfo.page) {
          window.location = fsmInfo.page;
        }
        if(sessionObj.userAddress) {
          displayLogin({userAddress: sessionObj.userAddress, background: fsmInfo.display});
        } else {
          displayLogin({background: fsmInfo.display});
        }
        if(fsmInfo.displayBlock) {
          document.getElementById(fsmInfo.displayBlock).style.display='block';
        }
        if(fsmInfo.displayNone) {
          document.getElementById(fsmInfo.displayNone).style.display='none';
        }
        if(fsmInfo.action) {
          fsmInfo.action(sessionObj);
        }
      }
    } else {
      window.location = '/';
    }
  }
  function createDb(sessionObj) {
    pimper.createDb(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, 'cors', function() {
      sessionObj.state = 'pop1';
      localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
      checkForLogin();
    });
  }
  function pop1(sessionObj) {
    pimper.pop1(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, sessionObj.proxy, function() {
      sessionObj.state = 'pop2';
      localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
      checkForLogin();
    });
  }
  function pop2(sessionObj) {
    pimper.pop2(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, sessionObj.proxy, function() {
      sessionObj.state = 'pop3';
      localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
      checkForLogin();
    });
  }
  function pop3(sessionObj) {
    pimper.pop3(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, sessionObj.proxy, function() {
      sessionObj.state = 'pop4';
      localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
      checkForLogin();
    });
  }
  function pop4(sessionObj) {
    pimper.pop4(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, sessionObj.proxy, function() {
      sessionObj.state = 'pop5';
      localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
      checkForLogin();
    });
  }
  function pop5(sessionObj) {
    pimper.pop5(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, sessionObj.proxy, function() {
      sessionObj.state = 'selfAccess1';
      localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
      checkForLogin();
    });
  }
  function doSelfAccess1(sessionObj) {
    selfAccess1(sessionObj, function(token) {
      sessionObj.bearerToken = token;
      sessionObj.storageApi = 'CouchDB';
      sessionObj.storageAddress = 'http://'+sessionObj.proxy+'/'+sessionObj.subdomain + '.iriscouch.com/documents/';
      sessionObj.state = 'selfAccess2';
      localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
      checkForLogin();
    });
  }
  function doSelfAccess2(sessionObj) {
    selfAccess2(sessionObj, function() {
      sessionObj.state = 'selfAccess3';
      localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
      checkForLogin();
    });
  }
  function doSelfAccess3(sessionObj) {
    selfAccess3(sessionObj, function() {
      sessionObj.state = 'storing';
      localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
      checkForLogin();
    });
  }
  function doStore(sessionObj) {
    store(sessionObj, function() {
      sessionObj.state = 'pulling';
      localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
      checkForLogin();
    });
  }
  function connectBackdoor(sessionObj) {
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
  }
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
  function doPing(sessionObj) {
    ping(sessionObj.subdomain, sessionObj.proxy, 0, function() {
      sessionObj.state = 'squatting1';
      localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
      checkForLogin();
    });
  }
  function doSquat1(sessionObj) {
    pimper.createAdminUser1(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, function() {
      sessionObj.state = 'squatting2';
      localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
      checkForLogin();
    });
  }
  function doSquat2(sessionObj) {
    pimper.createAdminUser2(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, function() {
      sessionObj.state = 'createDb';
      localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
      checkForLogin();
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
  function doSignIn(incomingObj) {
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
      audience: incomingObj.audience,
      assertion: incomingObj.assertion
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
  function pull() {
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
