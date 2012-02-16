//deal with legacy accounts and anonymous users:
(function() {
  localStorage.documents = localStorage.documents || '{}';
  localStorage.index = localStorage.index || '{}';
  if(!currentUser()) return;
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
  if(!sessionObj.storageInfo || !sessionObj.ownPadBackDoor) {
    sessionObj.storageInfo = {
      api: 'CouchDB',
      template: 'http://'+sessionObj.proxy+sessionObj.subdomain+'.iriscouch.com/{category}/',
      auth: 'http://'+sessionObj.subdomain+'.iriscouch.com/cors/auth/modal.html'
    };
    sessionObj.couchHost = sessionObj.couchHost || sessionObj.subdomain+'.iriscouch.com';
    sessionObj.ownPadBackDoor = 'https://'+sessionObj.couchHost+'/documents';
    sessionObj.state = 'storing' // write this to the db next time.
    localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
  }
})();

function checkLogin() {
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
  if(!sessionObj || sessionObj.state != 'ready') {
    window.location.href = 'welcome.html'
    return;
  }
  document.getElementById('signout').innerHTML = (sessionObj.userAddress?' '+sessionObj.userAddress:'');
  document.getElementById('signout').innerHTML += '<a class="btn btn-danger" href="#" onclick="signOut();"><i class="icon-remove icon-white"></i> Sign out</a>';
}

function signOut() {
  // signing a user out means clearing all their personal data off the device:
  localStorage.clear();
  window.location.href = 'welcome.html';
}

function currentUser() {
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj') || '{}');
  return sessionObj.userAddress;
}

function fetchDocuments(cb){
  getAndFetch('documents',cb);
}

// gets the etherpad document - contains text and all.
function fetchDocument(id, cb){
  if(id.split('$')[0] != currentUser()) return;
  getAndFetch('pad:'+id,function(doc){
    if(!doc) return;
    doc.id = id;
    cb(doc);
  });
}

function saveDocument(doc, cb){
  syncAndAdd('documents', doc.id, doc, cb);
  syncAndAdd('index', doc.owner+'$'+doc.link, doc.id);
}


function fetchPadId(owner, link, cb){
  var key = owner + '$' + link;
  var done = false;
  var index = {};
  getAndFetch('index', function(idx){
    idx = idx || {}
    index = idx; //cache for updating later
    if(done) return;
    if(idx[key]) {
      done = true;
      cb(idx[key]);
    }
  });

  require(['http://libredocs.org/js/remoteStorage-0.4.3.js'], function(remoteStorage) {
    getOrFetchStorageInfo(owner, function(err, ownerStorageInfo) {
      if(err) return; //TODO: might want to record this for debugging
      var client = remoteStorage.createClient(ownerStorageInfo, 'public');
      client.get(encodeURIComponent('padInfo:'+link), function(err2, data) {
        // if(data.movedTo)
        if(done) return; // got the info from my own doc list.
        if(err2) {//the callback should deal with a null
          cb(null);
        } else {
          getAndFetch('documents', function(docs) {
            docs[data.id] = data;
            setAndPush('documents', docs);
            index[key] = data.id;
            setAndPush('index', index);
            cb(data.id);
          });
        }
      });
    });
  });
}

function publishPadInfo(pad, cb) {
  var link = pad.link;
  var key = pad.owner + '$' + pad.link;
  var index = JSON.parse(localStorage.getItem('index') || '{}')
  index[key] = pad.id;
  setAndPush('index', index);

  var info = {
    id: pad.id,
    title: pad.title,
    owner: pad.owner,
    link: pad.link
  }
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
  require(['http://libredocs.org/js/remoteStorage-0.4.3.js'], function(remoteStorage) {
    var client = remoteStorage.createClient(sessionObj.storageInfo, 'public', sessionObj.bearerToken);
    client.put('padInfo:'+link, info, function(err, data) {
      console.log('pushed info '+info+' for docLink "'+link+'" - '+err+':"'+data+'"');
      cb();
    });
  });
}

function getOrFetchStorageInfo(user, cb) {
  var storageOwners = JSON.parse(localStorage.getItem('storageOwners') || '{}');
  if(storageOwners[user]) {
    cb(null, storageOwners[user]);
    return;
  }
  require(['http://libredocs.org/js/remoteStorage-0.4.3.js'], function(remoteStorage) {
    remoteStorage.getStorageInfo(user, function(err, storageInfo){
      storageOwners[user] = storageInfo;
      localStorage.setItem('storageOwners', JSON.stringify(storageOwners));
      cb(null, storageInfo);
    });
  });
}

function syncAndAdd(table, key, value, cb) {
  getAndFetch(table, function(recs) {
    recs[key] = value;
    setAndPush(table, recs, cb);
  });
}

function getAndFetch(key, cb){
  var local = localStorage.getItem(key);
  if(local) {
    local = JSON.parse(local);
    cb(local);
  }
  if(isRecent(key)) return;
  if(!hasBeenUpdated(key)) return;
  fetchRemote(key, function(err, value){
    // merge both records
    for (var i in local) { value[i] = value[i] || local[i]; }
    storeAndCallback(key, err, value, cb);
  });
}

function getOrFetchPublic(key, cb){
  var local = localStorage.getItem(key);
  if(local) {
    local = JSON.parse(local);
    cb(local);
    return;
  }
  fetchPublicRemote(key, function(err, value){
    storeAndCallback(key, err, value, cb);
  });
}

function storeAndCallback(key, err, value, cb){
  if(!err) {
    localStorage.setItem(key, JSON.stringify(value));
    timestamps = JSON.parse(localStorage.getItem('_timestamps')||'{}')
    timestamps[key] = new Date().getTime();
    localStorage.setItem('_timestamps', JSON.stringify(timestamps));
    cb(value);
  } else {
    if(err==404) {
      cb(null);
    }
  }
}

function isRecent(key, time){
  timestamps = JSON.parse(localStorage.getItem('_timestamps')||'{}')
  if(!timestamps[key]) return false;
  now = new Date().getTime();
  return now - timestamps[key] < (time || 60000);
}

function hasBeenUpdated(key, time){
  return true;
}

function setAndPush(key, value, cb){
  localStorage.setItem(key, JSON.stringify(value));
  timestamps = JSON.parse(localStorage.getItem('_timestamps')||'{}')
  timestamps[key] = new Date().getTime();
  localStorage.setItem('_timestamps', JSON.stringify(timestamps));
  pushRemote(key, value, cb);
}

function fetchRemote(key, cb){
  if(!currentUser()) return;
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
  require(['http://libredocs.org/js/remoteStorage-0.4.3.js'], function(remoteStorage) {
    var client = remoteStorage.createClient(sessionObj.storageInfo, 'documents', sessionObj.bearerToken);
    client.get(key, function(err, data) {
      console.log('fetched '+key+' - '+err+':"'+data+'"');
      cb(err, data);
    });
  });
}

function fetchPublicRemote(key, cb){
  if(!currentUser()) return;
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
  require(['http://libredocs.org/js/remoteStorage-0.4.3.js'], function(remoteStorage) {
    var client = remoteStorage.createClient(sessionObj.storageInfo, 'public');
    client.get(key, function(err, data) {
      console.log('fetched public '+key+' - '+err+':"'+data+'"');
      cb(err, data);
    });
  });
}

function pushRemote(key, value, cb){
  if(!currentUser()) return;
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
  require(['http://libredocs.org/js/remoteStorage-0.4.3.js'], function(remoteStorage) {
    var client = remoteStorage.createClient(sessionObj.storageInfo, 'documents', sessionObj.bearerToken);
    client.put(key, value, function(err, data) {
      console.log('pushed '+key+' - '+err+':"'+data+'"');
      if(cb) cb();
    });
  });
}
