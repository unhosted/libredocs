//deal with legacy accounts and anonymous users:
(function() {
  // make sure we throw no errors in old browsers
  if(!window.localStorage) return;

  localStorage.documents = localStorage.documents || '{}';
  localStorage.index = localStorage.index || '{}';
  if(!currentUser()) return;
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
  var changed = false;
  //unless the sessionObj specifies that it wants to stay on the clientSide, do these data format upgrades:
  if(!sessionObj.clientSide && (!sessionObj.storageInfo || !sessionObj.ownPadBackDoor || !sessionObj.couchHost)) {
    sessionObj.storageInfo = {
      api: 'CouchDB',
      template: 'http://'+sessionObj.proxy+sessionObj.subdomain+'.iriscouch.com/{category}/',
      auth: 'http://'+sessionObj.subdomain+'.iriscouch.com/cors/auth/modal.html'
    };
    sessionObj.couchHost = sessionObj.couchHost || sessionObj.subdomain+'.iriscouch.com';
    sessionObj.ownPadBackDoor = 'https://'+sessionObj.couchHost+'/documents';
    changed = true;
  }
  if(sessionObj.proxy.indexOf('yourremotestorage.net') != -1)
  {
    sessionObj.proxy = 'proxy.'+location.host+'/';
    sessionObj.storageInfo.template = 
      'http://' + sessionObj.proxy + sessionObj.couchHost + '/{category}/';
    changed = true;
  }
  if(changed)
  {
    sessionObj.state = 'storing' // write this to the db next time.
    localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
  }
})();

function checkLogin() {
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
  if(!sessionObj || sessionObj.state != 'ready') {
    return;
  }
  document.getElementById('signout').innerHTML = (sessionObj.userAddress?' '+sessionObj.userAddress:'');
  document.getElementById('signout').innerHTML += '<a class="btn btn-danger" href="#" onclick="signOut();"><i class="icon-remove icon-white"></i> Sign out</a>';
}

function signOut() {
  // signing a user out means clearing all their personal data off the device:
  localStorage.clear();
  window.location.href = '';
}

function currentUser() {
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj') || '{}');
  return sessionObj.userAddress;
}

