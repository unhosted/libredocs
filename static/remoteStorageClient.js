var remoteStorageClient = (function() {
  var handlers = {};
  function on(event, handler) {
    handlers[event]=handler;
  }
  var sessionObj;
  var sessionStates = {
    signIn: { page: '/loggedIn.html', display:'signing you in', action: doSignIn, next:{found:'pulling', needsWebfinger:'wf1', needsAllow:'allowRemoteStorage'}},
    wf1: { page: '/loggedIn.html', display:'checking', action: checkWebfinger, next:{fail: 'needed', ok: 'allowRemoteStorage'}},
    needed: { page: '/loggedIn.html', display:'pending 1/15', displayBlock:'3'},
    enroll: { page: '/loggedIn.html', display:'pending 2/15', displayNone:'3', action: enroll, next:{409: 'enroll',201:'pinging'}},
    pinging: { page: '/loggedIn.html', display:'pending 3/15', action: doPing, next:{200:'squatting1'}},
    squatting1: { page: '/loggedIn.html', display:'pending 4/15', action: doSquat1, next:{201:'squatting2'}},
    squatting2: { page: '/loggedIn.html', display:'pending 5/15', action: doSquat2, next:{200:'createDb'}},
    createDb: { page: '/loggedIn.html', display:'pending 6/15', action: createDb, next:{201:'pop1'}},
    pop1: { page: '/loggedIn.html', display:'pending 7/15', action: pop1, next:{201: 'pop2'}},
    pop2: { page: '/loggedIn.html', display:'pending 8/15', action: pop2, next:{201: 'pop3'}},
    pop3: { page: '/loggedIn.html', display:'pending 9/15', action: pop3, next:{201: 'pop4'}},
    pop4: { page: '/loggedIn.html', display:'pending 10/15', action: pop4, next:{201: 'pop5'}},
    pop5: { page: '/loggedIn.html', display:'pending 11/15', action: pop5, next:{201: 'selfAccess1'}},
    selfAccess1: { page: '/loggedIn.html', display:'pending 12/15', action: doSelfAccess1, next:{201: 'selfAccess2'}},
    selfAccess2: { page: '/loggedIn.html', display:'pending 13/15', action: doSelfAccess2, next:{201: 'selfAccess3'}},
    selfAccess3: { page: '/loggedIn.html', display:'pending 14/15', action: doSelfAccess3, next:{200: 'storing'}},
    storing: { page: '/loggedIn.html', display:'pending 15/15', action: doStore, next:{201: 'pulling'}},
    allowRemoteStorage: { page: '/loggedIn.html', buttons:['allow', 'cancel']},
    pulling: { page: '/loggedIn.html', display:'pulling', buttons:['logout'], action: pull},
    error: { page: '/loggedIn.html', display:'error', buttons:['logout']}
  };
  function checkForLogin() {
    if(!sessionObj) {
      sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
    }
    if(sessionObj) {
      if(sessionStates[sessionObj.state]) {
        var fsmInfo = sessionStates[sessionObj.state];
        if(window.location.pathname != fsmInfo.page) {
          window.location = fsmInfo.page;
        }
        if(handlers['status']) {
          if(sessionObj.userAddress) {
            handlers['status']({userAddress: sessionObj.userAddress, background: fsmInfo.display});
          } else {
            handlers['status']({background: fsmInfo.display});
          }
        }
        if(fsmInfo.displayBlock) {
          document.getElementById(fsmInfo.displayBlock).style.display='block';
        }
        if(fsmInfo.displayNone) {
          document.getElementById(fsmInfo.displayNone).style.display='none';
        }
        if(fsmInfo.action) {
          fsmInfo.action(function(result) {
            console.log('got result "'+result+'" in step "'+sessionObj.state+'".');
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
  function doSignIn(cb) {
    var xhr=new XMLHttpRequest();
    xhr.open('POST', 'http://libredocs.org/users', true);
    xhr.onreadystatechange = function() {
      if(xhr.readyState == 4) {
        var newSessionObj = {};
        try {
          newSessionObj = JSON.parse(xhr.responseText);
          sessionObj = newSessionObj;
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
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
          console.log('calling webfinger for '+sessionObj.userAddress);
          cb('needsWebfinger');
        } else {
          alert('something went wrong! "'+xhr.responseText+'"['+xhr.status+']');
          localStorage.clear();
          window.location='/';
        }
      }
    };
    xhr.send(JSON.stringify({
      audience: sessionObj.audience,
      assertion: sessionObj.assertion
    }));
  }
  function checkWebfinger(cb) {
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
  function enroll(cb) {
    var userName = sessionObj.userAddress.replace(/-/g, '--').replace(/@/g, '-at-').replace(/\./g, '-dot-')+(sessionObj.userNameTry?'-'+sessionObj.userNameTry:'');
    pimper.provision(userName, sessionObj.firstName, sessionObj.lastName, sessionObj.userAddress, sessionObj.adminPwd, function(result) {
      if(result=='taken') {
        console.log('Username '+userName+' is taken! :( trying a different one');
        //sessionObj.userNameTry = (sessionObj.userNameTry?sessionObj.userNameTry:0)+1;
        sessionObj.userNameTry = (sessionObj.userNameTry?sessionObj.userNameTry:14)+1;//skip straight to higher numbers, so debugging doesn't take that long
        localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
        cb('taken');
      } else if(result=='success') {
        sessionObj.subdomain = userName;
        sessionObj.proxy = 'yourremotestorage.net/CouchDB/proxy/';
        localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
        cb('success');
      } else {
        alert('error '+result+' in provision step');
        cb('error');
      }
    });
  }
  function ping(userName, proxy, counter, cb) {
    //for(var i=0; i<=counter; i++) {
    //  document.getElementById('status').innerHTML += '.';
    //}
    if(counter > 10) {
      alert('your remote storage was not deployed within 10 pings. please try again.');
      cb('error');
    } else {
      pimper.ping(userName, proxy, function(result) {
        if(result=='ok') {
          cb('success');
        } else if(result='no') {
          console.log('ping '+counter+'...');
          ping(userName, proxy, counter+1, cb);
        } else {
          alert('Error code '+result);
          cb('error');
        }
      });
    }
  }
  function doPing(cb) {
    ping(sessionObj.subdomain, sessionObj.proxy, 0, cb);
  }
  function doSquat1(cb) {
    pimper.createAdminUser1(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, cb);
  }
  function doSquat2(cb) {
    pimper.createAdminUser2(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, cb);
  }
  function createDb(cb) {
    pimper.createDb(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, 'cors', cb);
  }
  function pop1(cb) {
    pimper.pop1(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, sessionObj.proxy, cb);
  }
  function pop2(cb) {
    pimper.pop2(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, sessionObj.proxy, cb);
  }
  function pop3(cb) {
    pimper.pop3(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, sessionObj.proxy, cb);
  }
  function pop4(cb) {
    pimper.pop4(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, sessionObj.proxy, cb);
  }
  function pop5(cb) {
    pimper.pop5(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, sessionObj.proxy, cb);
  }
  function doSelfAccess1(cb) {
    pimper.createUser(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, 'http___libredocs_org', function(token) {
      sessionObj.bearerToken = token;
      sessionObj.storageApi = 'CouchDB';
      sessionObj.storageAddress = 'http://'+sessionObj.proxy+'/'+sessionObj.subdomain + '.iriscouch.com/documents/';
      localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
      cb('success');
    });
  }
  function doSelfAccess2(cb) {
    pimper.createDb(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, 'documents', cb);
  }
  function doSelfAccess3(cb) {
    pimper.giveAccess(sessionObj.subdomain+'.iriscouch.com', sessionObj.userAddress, sessionObj.adminPwd, 'documents', 'http___libredocs_org', false, cb);
  }
  function doStore(cb) {
    sessionObj.action='set';
    sessionObj.ok=true;
    var xhr = new XMLHttpRequest();
    xhr.open('PUT', 'http://libredocs.org/users', true);
    xhr.onreadystatechange = function() {
      if(xhr.readyState == 4) {
        cb(xhr.status);
      }
    };
    xhr.send(JSON.stringify(sessionObj));
  }
  function pull() {
  }
  function allow() {
    if(!sessionObj) {
      sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
    }
    window.open(sessionObj.attr.auth+'?redirect_uri=http://libredocs.org/rcvToken.html&scope=documents');
  }
  function agree() {
    if(!sessionObj) {
      sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
    }
    sessionObj = {
      state: 'enroll',
      firstName: document.getElementById('firstName').value,
      lastName: document.getElementById('lastName').value,
      adminPwd: sessionObj.adminPwd,//the admin pwd that was generated doubles as provisioning token during provisioning
      userAddress: sessionObj.userAddress
    };
    localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
    checkForLogin();
  }
  function signIn(audience, assertion) {
    sessionObj = {
      state: 'signIn',
      audience: audience,
      assertion: assertion
    };
    localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
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
