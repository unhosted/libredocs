var remoteStorageClient = (function() {
  var sessionStates = {
    signIn: { page: '/loggedIn.html', display:'signing you in', action: doSignIn, next:{found:'pulling', needsWebfinger:'wf1', needsAllow:'allowRemoteStorage'}},
    wf1: { page: '/loggedIn.html', display:'checking', action: checkWebfinger, next:{fail: 'needed', ok: 'allowRemoteStorage'}},
    needed: { page: '/loggedIn.html', display:'pending 1/15', displayBlock:'3'},
    enroll: { page: '/loggedIn.html', display:'pending 2/15', displayNone:'3', action: enroll, next:{taken: 'enroll', success:'pinging'}},
    pinging: { page: '/loggedIn.html', display:'pending 3/15', action: doPing, next:{success:'squatting1'}},
    squatting1: { page: '/loggedIn.html', display:'pending 4/15', action: doSquat1, next:{success:'squatting2'}},
    squatting2: { page: '/loggedIn.html', display:'pending 5/15', action: doSquat2, next:{success:'createDb'}},
    createDb: { page: '/loggedIn.html', display:'pending 6/15', action: createDb, next:{success:'pop1'}},
    pop1: { page: '/loggedIn.html', display:'pending 7/15', action: pop1, next:{success: 'pop2'}},
    pop2: { page: '/loggedIn.html', display:'pending 8/15', action: pop2, next:{success: 'pop3'}},
    pop3: { page: '/loggedIn.html', display:'pending 9/15', action: pop3, next:{success: 'pop4'}},
    pop4: { page: '/loggedIn.html', display:'pending 10/15', action: pop4, next:{success: 'pop5'}},
    pop5: { page: '/loggedIn.html', display:'pending 11/15', action: pop5, next:{success: 'selfAccess1'}},
    selfAccess1: { page: '/loggedIn.html', display:'pending 12/15', action: doSelfAccess1, next:{success: 'selfAccess2'}},
    selfAccess2: { page: '/loggedIn.html', display:'pending 13/15', action: doSelfAccess2, next:{success: 'selfAccess3'}},
    selfAccess3: { page: '/loggedIn.html', display:'pending 14/15', action: doSelfAccess3, next:{success: 'storing'}},
    storing: { page: '/loggedIn.html', display:'pending 15/15', action: doStore, next:{success: 'pulling'}},
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
          fsmInfo.action(sessionObj, function(result) {
            if(fsmInfo.next && fsmInfo.next[result]) {
              sessionObj.state = fsmInfo.next[result];
              localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
              checkForLogin();
            } else {
              sessionObj.state = 'error';
              localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
              checkForLogin();
            }
          });
        }
      }
    } else {
      window.location = '/';
    }
  }
  function createDb(sessionObj, cb) {
    pimper.createDb(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, 'cors', function() {
      cb('success');
    });
  }
  function pop1(sessionObj, cb) {
    pimper.pop1(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, sessionObj.proxy, function() {
      cb('success');
    });
  }
  function pop2(sessionObj) {
    pimper.pop2(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, sessionObj.proxy, function() {
      cb('success');
    });
  }
  function pop3(sessionObj) {
    pimper.pop3(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, sessionObj.proxy, function() {
      cb('success');
    });
  }
  function pop4(sessionObj) {
    pimper.pop4(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, sessionObj.proxy, function() {
      cb('success');
    });
  }
  function pop5(sessionObj) {
    pimper.pop5(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, sessionObj.proxy, function() {
      cb('success');
    });
  }
  function doSelfAccess1(sessionObj) {
    pimper.createUser(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, 'http___libredocs_org', function(token) {
      sessionObj.bearerToken = token;
      sessionObj.storageApi = 'CouchDB';
      sessionObj.storageAddress = 'http://'+sessionObj.proxy+'/'+sessionObj.subdomain + '.iriscouch.com/documents/';
      localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
      cb('success');
    });
  }
  function doSelfAccess2(sessionObj) {
    pimper.createDb(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, 'documents', function() {
      cb('success');
    });
  }
  function doSelfAccess3(sessionObj) {
    pimper.giveAccess(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, 'documents', 'http___libredocs_org', false, function() {
      cb('success');
    });
  }
  function doStore(sessionObj) {
    store(sessionObj, function() {
      cb('success');
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
  function doPing(sessionObj, cb) {
    ping(sessionObj.subdomain, sessionObj.proxy, 0, function() {
      cb('success');
    });
  }
  function doSquat1(sessionObj, cb) {
    pimper.createAdminUser1(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, function() {
      cb('success');
    });
  }
  function doSquat2(sessionObj, cb) {
    pimper.createAdminUser2(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, function() {
      cb('success');
    });
  }
  function getUserNameForIrisCouch(userAddress, userNameTry) {
    return userAddress.replace(/-/g, '--').replace(/@/g, '-at-').replace(/\./g, '-dot-')+(userNameTry?'-'+userNameTry:'');
  }
  function enroll(sessionObj, cb) {
    var userName = getUserNameForIrisCouch(sessionObj.userAddress, sessionObj.userNameTry);
    pimper.provision(userName, sessionObj.firstName, sessionObj.lastName, sessionObj.userAddress, sessionObj.adminPwd, function(result) {
      if(result=='taken') {
        console.log('Username '+userName+' is taken! :( trying a different one');
        //sessionObj.userNameTry = (sessionObj.userNameTry?sessionObj.userNameTry:0)+1;
        sessionObj.userNameTry = (sessionObj.userNameTry?sessionObj.userNameTry:14)+1;//skip straight to higher numbers, so debugging doesn't take that long
        localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
        cb('taken');
      } else if(result=='ok') {
        sessionObj.subdomain = userName;
        sessionObj.proxy = 'yourremotestorage.net/CouchDB/proxy/';
        localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
        cb('success');
      }
    });
  }
  function checkWebfinger(sessionObj, cb) {
    if(sessionObj.state == 'wf1') {
      require(['webfinger'], function(webfinger) {
        webfinger.getAttributes(sessionObj.userAddress, {
          onError: function(code, msg) {
            if(code == 5) {
              cb('fail');
            }
          }
        }, function() {}, function(attr) {
          sessionObj.attr = attr;
          sessionObj.storageAddress = webfinger.resolveTemplate(attr.template, 'documents');
          sessionObj.storageApi = attr.api;
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          cb('ok');
        });
      });
    }
  }
  function doSignIn(incomingObj, cb) {
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
            cb('found');
          } else {
            cb('needsAllow');
          }
        } else if(sessionObj.userAddress) {
          cb('needsWebfinger');
        } else {
          alert('something went wrong! "'+xhr.responseText+'"['+xhr.status+']');
          localStorage.clear();
          window.location='/';
        }
      }
    };
    xhr.send(JSON.stringify({
      audience: incomingObj.audience,
      assertion: incomingObj.assertion
    }));
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
        state: 'enroll',
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
