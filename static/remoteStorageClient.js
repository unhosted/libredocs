var remoteStorageClient = (function() {
  var handlers = {};
  function on(event, handler) {
    handlers[event]=handler;
  }
  var sessionObj;
  var sessionStates = {
    signIn: { page: '/loggedIn.html', display:'signing you in', loadingBar:10, action: doSignIn, next:{found:'ready', needsWebfinger:'wf1', needsAllow:'allowRemoteStorage'}},
    wf1: { page: '/loggedIn.html', display:'checking', loadingBar:20, action: checkWebfinger, next:{needSignup: 'needed', ok: 'allowRemoteStorage'}},
    needed: { page: '/loggedIn.html', display:'pending', displayBlock:'easyfreedom-signup'},
    enroll: { page: '/loggedIn.html', display:'pending', loadingBar:40, displayNone:'easyfreedom-signup', action: enroll, next:{409: 'enroll',201:'pinging'}},
    pinging: { page: '/loggedIn.html', display:'pending', loadingBar:50, action: doPing, next:{200:'squatting1'}},
    squatting1: { page: '/loggedIn.html', display:'pending', loadingBar:60, action: doSquat1, next:{201:'squatting2'}},
    squatting2: { page: '/loggedIn.html', display:'pending', loadingBar:63, action: doSquat2, next:{200:'createDb'}},
    createDb: { page: '/loggedIn.html', display:'pending', loadingBar:66, action: createDb, next:{201:'pop1'}},
    pop1: { page: '/loggedIn.html', display:'pending', loadingBar:70, action: pop1, next:{201: 'pop2'}},
    pop2: { page: '/loggedIn.html', display:'pending', loadingBar:73, action: pop2, next:{201: 'pop3'}},
    pop3: { page: '/loggedIn.html', display:'pending', loadingBar:76, action: pop3, next:{201: 'pop4'}},
    pop4: { page: '/loggedIn.html', display:'pending', loadingBar:80, action: pop4, next:{201: 'pop5'}},
    pop5: { page: '/loggedIn.html', display:'pending', loadingBar:83, action: pop5, next:{201: 'selfAccess1'}},
    selfAccess1: { page: '/loggedIn.html', display:'pending', loadingBar:86, action: doSelfAccess1, next:{201: 'selfAccess2'}},
    selfAccess2: { page: '/loggedIn.html', display:'pending', loadingBar:90, action: doSelfAccess2, next:{201: 'selfAccess3'}},
    selfAccess3: { page: '/loggedIn.html', display:'pending', loadingBar:93, action: doSelfAccess3, next:{200: 'storing'}},
    storing: { page: '/loggedIn.html', display:'pending', loadingBar:96, action: doStore, next:{200: 'ready'}},
    allowRemoteStorage: { page: '/loggedIn.html', loadingBar:60, buttons:['Allow', 'Cancel']},
    ready: { page: '/list.html' },
    error: { page: '/loggedIn.html', display:'error', buttons:['Sign out']}
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
          var status = {};
          if(fsmInfo.display) {
            status.step = fsmInfo.display;
          }
          if(fsmInfo.buttons) {
            status.buttons = fsmInfo.buttons;
          }
          if(fsmInfo.loadingBar) {
            status.loadingBar = fsmInfo.loadingBar;
          }
          if(sessionObj.userAddress) {
            status.userAddress = sessionObj.userAddress;
          }
          handlers['status'](status);
        }
        if(fsmInfo.loadingBar) {
          document.getElementById('easyfreedom-loading').style.display='block';
          document.getElementById('easyfreedom-loadingbar').style.width=fsmInfo+'%';
        } else {
          document.getElementById('easyfreedom-loading').style.display='none';
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
        var oldSessionObj = sessionObj;//sorry for this
        try {
          newSessionObj = JSON.parse(xhr.responseText);
          sessionObj = newSessionObj;
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
        } catch(e) {
        }
        if(sessionObj.ok) {
          //this happens if we have a UserAddress record stored (for webfingerless user addresses)
          if(oldSessionObj.audience=='http://libredocs.org') {//then the bearerToken is also directly stored in there
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
    require(['0.3.0/remoteStorage'], function(remoteStorage) {
      remoteStorage.getStorageInfo(sessionObj.userAddress, function(err, storageInfo) {
        if(err) {
          cb('needSignup');
        } else {
          sessionObj.storageInfo = storageInfo;
          localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
          cb('ok');
        }
      });
    });
  }
  function enroll(cb) {
    var userName = sessionObj.userAddress.replace(/-/g, '--').replace(/@/g, '-at-').replace(/\./g, '-dot-')+(sessionObj.userNameTry?'-'+sessionObj.userNameTry:'');
    pimper.provision(userName, sessionObj.firstName, sessionObj.lastName, sessionObj.userAddress, sessionObj.adminPwd, function(result) {
      if(result==409) {
        sessionObj.userNameTry = (sessionObj.userNameTry?sessionObj.userNameTry:23)+1;//skip straight to higher numbers, so debugging doesn't take that long
        localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
      } else if(result==201) {
        sessionObj.couchHost = userName+'.iriscouch.com';
        sessionObj.proxy = 'yourremotestorage.net/CouchDB/proxy/';
        localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
      }
      cb(result);
    });
  }
  function ping(couchHost, proxy, counter, cb) {
    if(counter > 10) {//we could move this into the state machine as states ping1 .. ping10, but that would give so many states
      alert('your remote storage was not deployed within 10 pings. please try again.');
      cb('error');
    } else {
      pimper.ping(couchHost, proxy, function(result) {
        if(result==404) {
          console.log('ping '+counter+'...');
          ping(couchHost, proxy, counter+1, cb);
        } else {
          cb(result);
        }
      });
    }
  }
  function doPing(cb) {
    ping(sessionObj.couchHost, sessionObj.proxy, 0, cb);
  }
  function doSquat1(cb) {
    pimper.createAdminUser1(sessionObj.couchHost, sessionObj.userAddress, sessionObj.adminPwd, cb);
  }
  function doSquat2(cb) {
    pimper.createAdminUser2(sessionObj.couchHost, sessionObj.userAddress, sessionObj.adminPwd, cb);
  }
  function createDb(cb) {
    pimper.createDb(sessionObj.couchHost, sessionObj.userAddress, sessionObj.adminPwd, 'cors', cb);
  }
  function pop1(cb) {
    var couchAddress = sessionObj.couchHost;
    var httpTemplate = 'http://'+sessionObj.proxy+couchAddress+'/{category}/';
    var putHost = 'http://'+sessionObj.proxy+couchAddress;
    var authStr = {
      usr:sessionObj.userAddress,
      pwd:sessionObj.adminPwd
    };
    pimper.createDocument(putHost, 'cors', '_design/well-known', authStr, '{'+
      '\"_id\": \"_design/well-known\",'+
      '\"shows\": {'+
        '\"host-meta\":'+ 
          '\"function\(doc, req\) { return {'+
            ' \\"body\\": \\"'+
            '<?xml version=\\\\\\"1.0\\\\\\" encoding=\\\\\\"UTF-8\\\\\\"?>\\\\\\n'+
            '<XRD xmlns=\\\\\\"http://docs.oasis-open.org/ns/xri/xrd-1.0\\\\\\" xmlns:hm=\\\\\\"http://host-meta.net/xrd/1.0\\\\\\">\\\\\\n'+
            '  <hm:Host xmlns=\\\\\\"http://host-meta.net/xrd/1.0\\\\\\">'+couchAddress+'</hm:Host>\\\\\\n'+
            '  <Link rel=\\\\\\"lrdd\\\\\\" template=\\\\\\"http://'+couchAddress+'/cors/_design/well-known/_show/webfinger?q={uri}\\\\\\"></Link>\\\\\\n'+
            '</XRD>\\\\\\n\\",'+
            '\\"headers\\": {\\"Access-Control-Allow-Origin\\": \\"*\\", \\"Content-Type\\": \\"application/xml+xrd\\"}'+
          '};}\",'+
        '\"webfinger\":'+ 
          '\"function\(doc, req\) { return {'+
            ' \\"body\\": \\"'+
            '<?xml version=\\\\\\"1.0\\\\\\" encoding=\\\\\\"UTF-8\\\\\\"?>\\\\\\n'+
            '<XRD xmlns=\\\\\\"http://docs.oasis-open.org/ns/xri/xrd-1.0\\\\\\" xmlns:hm=\\\\\\"http://host-meta.net/xrd/1.0\\\\\\">\\\\\\n'+
            '  <hm:Host xmlns=\\\\\\"http://host-meta.net/xrd/1.0\\\\\\">'+couchAddress+'</hm:Host>\\\\\\n'+
            '  <Link \\\\\\n'+
            '    rel=\\\\\\"remoteStorage\\\\\\"\\\\\\n'+
            '    api=\\\\\\"CouchDB\\\\\\"\\\\\\n'+
            '    auth=\\\\\\"http://'+couchAddress+'/cors/auth/modal.html\\\\\\"\\\\\\n'+
            '    template=\\\\\\"'+httpTemplate+'\\\\\\"\\\\\\n'+
            '  ></Link>\\\\\\n'+
            '</XRD>\\\\\\n\\",'+
            '\\"headers\\": {\\"Access-Control-Allow-Origin\\": \\"*\\", \\"Content-Type\\": \\"application/xml+xrd\\"}'+
          '};}\",'+
        '\"vep\":'+
          '\" function\(doc, req\) { return { \\"body\\": \\"\(coming soon\)\\",'+
          ' \\"headers\\": {\\"Access-Control-Allow-Origin\\": \\"*\\"}'+
         '};}\"'+
         '}}', cb);
  }
  function pop2(cb) {
    var couchAddress = sessionObj.couchHost;
    var putHost = 'http://'+sessionObj.proxy+couchAddress;
    var authStr = {
      usr:sessionObj.userAddress,
      pwd:sessionObj.adminPwd
    };
    pimper.uploadAttachment(putHost, 'cors', 'auth', authStr, 'modal.html', 'http://libredocs.org/beFree/files/modal.html', 'text/html', cb);
  }
  function pop3(cb) {
    var couchAddress = sessionObj.couchHost;
    var putHost = 'http://'+sessionObj.proxy+couchAddress;
    var authStr = {
      usr:sessionObj.userAddress,
      pwd:sessionObj.adminPwd
    };
    pimper.uploadAttachment(putHost, 'cors', 'base64', authStr, 'base64.js', 'http://libredocs.org/beFree/files/base64.js', 'application/javascript', cb);
  }
  function pop4(cb) {
    var couchAddress = sessionObj.couchHost;
    var putHost = 'http://'+sessionObj.proxy+couchAddress;
    var authStr = {
      usr:sessionObj.userAddress,
      pwd:sessionObj.adminPwd
    };
    pimper.uploadAttachment(putHost, 'cors', 'sha1', authStr, 'sha1.js', 'http://libredocs.org/beFree/files/sha1.js', 'application/javascript', cb);
  }
  function pop5(cb) {
    var couchAddress = sessionObj.couchHost;
    pimper.setConfig(couchAddress, sessionObj.userAddress, sessionObj.adminPwd, 'browserid', {
      enabled: true,
      verify_url: 'https://browserid.org/verify'
    }, cb);
  }
  function doSelfAccess1(cb) {
    pimper.createUser(sessionObj.couchHost, sessionObj.userAddress, sessionObj.adminPwd, 'http___libredocs_org', function(result, token) {
      sessionObj.bearerToken = token;
      sessionObj.storageInfo = {
        api: 'CouchDB',
        template: 'http://'+sessionObj.proxy+sessionObj.couchHost + '/{category}/',
        auth: 'http://'+sessionObj.couchHost + '/cors/auth/modal.html'
      };
      localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
      cb(result);
    });
  }
  function doSelfAccess2(cb) {
    pimper.createDb(sessionObj.couchHost, sessionObj.userAddress, sessionObj.adminPwd, 'documents', cb);
  }
  function doSelfAccess3(cb) {
    pimper.giveAccess(sessionObj.couchHost, sessionObj.userAddress, sessionObj.adminPwd, 'documents', 'http___libredocs_org', false, cb);
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
  function pull(cb) {
    cb('done');
  }
  function allow() {
    if(!sessionObj) {
      sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
    }
    window.open(sessionObj.storageInfo.auth);
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
  function signOut() {
    localStorage.clear();
    window.location = '/';
  }
  return {
    on: on,
    signIn: signIn,
    checkForLogin: checkForLogin,
    allow: allow,
    agree: agree,
    signOut: signOut,
    cancel: signOut
  };
})();
