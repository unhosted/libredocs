var remoteStorageClient = (function() {
  var handlers = {};
  function on(event, handler) {
    handlers[event]=handler;
  }
  var sessionObj;
  var sessionStates = {
    signIn: { page: '/signin.html', display:'Sign in &hellip;', loadingBar:10, action: doSignIn, next:{found:'ready', needsWebfinger:'wf1', needsAllow:'allowRemoteStorage'}},
    wf1: { page: '/signin.html', display:'Checking &hellip;', loadingBar:20, action: checkWebfinger, next:{needSignup: 'needed', ok: 'allowRemoteStorage'}},
    needed: { page: '/signin.html', display:'', displayBlock:'easyfreedom-signup'},
    enroll: { page: '/signin.html', display:'Creating account &hellip;', loadingBar:40, displayNone:'easyfreedom-signup', action: enroll, next:{409: 'enroll',201:'pinging'}},
    pinging: { page: '/signin.html', display:'Creating account &hellip;', loadingBar:50, action: doPing, next:{200:'squatting1'}},
    squatting1: { page: '/signin.html', display:'Creating account &hellip;', loadingBar:60, action: doSquat1, next:{201:'squatting2'}},
    squatting2: { page: '/signin.html', display:'Creating account &hellip;', loadingBar:63, action: doSquat2, next:{200:'createDb'}},
    createDb: { page: '/signin.html', display:'Creating database &hellip;', loadingBar:66, action: createDb, next:{201:'pop1', 412:'pop1'}},
    pop1: { page: '/signin.html', display:'Creating database &hellip;', loadingBar:70, action: pop1, next:{201: 'pop2'}},
    pop2: { page: '/signin.html', display:'Creating database &hellip;', loadingBar:73, action: pop2, next:{201: 'pop3'}},
    pop3: { page: '/signin.html', display:'Creating database &hellip;', loadingBar:76, action: pop3, next:{201: 'pop4'}},
    pop4: { page: '/signin.html', display:'Creating database &hellip;', loadingBar:80, action: pop4, next:{201: 'pop5'}},
    pop5: { page: '/signin.html', display:'Creating database &hellip;', loadingBar:83, action: pop5, next:{200: 'selfAccess1'}},
    selfAccess1: { page: '/signin.html', display:'Linking &hellip;', loadingBar:86, action: doSelfAccess1, next:{201: 'selfAccess2'}},
    selfAccess2: { page: '/signin.html', display:'Linking &hellip;', loadingBar:90, action: doSelfAccess2, next:{201: 'selfAccess3'}},
    selfAccess3: { page: '/signin.html', display:'Linking &hellip;', loadingBar:93, action: doSelfAccess3, next:{200: 'storing'}},
    storing: { page: '/signin.html', display:'Saving &hellip;', loadingBar:96, action: doStore, next:{200: 'ready'}},
    allowRemoteStorage: { page: '/signin.html', loadingBar:60, buttons:['Allow', 'Cancel']},
    ready: { page: '/documents.html' },
    error: { page: '/signin.html', display:'Error', action: alertError, buttons:['Sign out']}
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
           var t;
           if(sessionObj.state != 'ready' && sessionObj.state != 'error') {
             stepToTimeout = sessionObj.state;
             t = setTimeout(stepTimeout, 20000);
           }
           fsmInfo.action(function(result) {
            if(t) {
              clearTimeout(t);
            }
            console.log('got result "'+result+'" in step "'+sessionObj.state+'".');
            if(fsmInfo.next && fsmInfo.next[result]) {
              sessionObj.state = fsmInfo.next[result];
              localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
              checkForLogin();
            } else {
              if(sessionObj.state != 'ready') {
                sessionObj.problem = 'no handler for result "'+result+'" in step "'+sessionObj.state+'"';
                sessionObj.step = sessionObj.state;
                sessionObj.state = 'error';
                localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
                checkForLogin();
              }
            }
          });
        }
      }
    } else {
      window.location = '/welcome.html';
    }
  }
  function stepTimeout() {
    if(stepToTimeout) {
      var message = 'Step took to long for "'+sessionObj.userAddress+'".';
      doAlert('Providing remoteStorage timed out at '+stepToTimeout, message, sessionObj)
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
          doAlert('Failed fetching user data from database.',
             'This should not have happened.', xhr);
          localStorage.clear();
          window.location='/welcome.html';
        }
      }
    };
    xhr.send(JSON.stringify({
      audience: sessionObj.audience,
      assertion: sessionObj.assertion
    }));
  }
  function checkWebfinger(cb) {
    require(['http://unhosted.org/remoteStorage-0.4.2.js'], function(remoteStorage) {
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
      var sessionObj = JSON.parse(localStorage.sessionObj);
      sessionObj.problem = 'could not ping "'+couchHost+'" through proxy "'+proxy+'" for "'+counter+'" times';
      localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
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
    pimper.setConfig(couchAddress, sessionObj.userAddress, sessionObj.adminPwd, 'browserid', 'enabled', 'true', cb);
  }
  function doSelfAccess1(cb) {
    pimper.createUser(sessionObj.couchHost, sessionObj.userAddress, sessionObj.adminPwd, 'http___libredocs_org', function(result, token) {
      sessionObj.bearerToken = token;
      sessionObj.storageInfo = {
        api: 'CouchDB',
        template: 'http://'+sessionObj.proxy+sessionObj.couchHost + '/{category}/',
        auth: 'http://'+sessionObj.couchHost + '/cors/auth/modal.html'
      };
      sessionObj.ownPadBackDoor = 'https://'+sessionObj.couchHost+'/documents';
      localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
      cb(result);
    });
  }
  function doSelfAccess2(cb) {
    pimper.createDb(sessionObj.couchHost, sessionObj.userAddress, sessionObj.adminPwd, 'documents', cb);
    pimper.createDb(sessionObj.couchHost, sessionObj.userAddress, sessionObj.adminPwd, 'public', cb);
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
  function doAlert(heading, message, debug) {
    if(typeof alertMessage === 'function'){
      alertMessage(heading, message, debug);
    }
    else
    {
      alert(heading + message);
    }
  }
  function pull(cb) {
    cb('done');
  }
  function alertError(cb) {
    var step = sessionObj.step || sessionObj.state;
    var problem = sessionObj.problem
    doAlert('Providing remoteStorage failed at '+step, problem, sessionObj)
  }
  function retryStep() {
    sessionObj.state = sessionObj.step || sessionObj.state;
    checkForLogin();
  }
  function startOver() {
    var reset = {}
    reset.action='set';
    reset.ok=false;
    reset.userAddress=sessionObj.userAddress;
    reset.adminPwd=sessionObj.adminPwd;
    reset.firstName=sessionObj.firstName;
    reset.lastName=sessionObj.lastName;
    localStorage.setItem('sessionObj', JSON.stringify(reset));
    sessionObj=reset;
    checkForLogin();
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
    window.location = '/welcome.html';
  }
  return {
    on: on,
    signIn: signIn,
    checkForLogin: checkForLogin,
    allow: allow,
    agree: agree,
    signOut: signOut,
    retryStep: retryStep,
    startOver: startOver,
    cancel: signOut
  };
})();
