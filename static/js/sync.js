
function fetchDocuments(cb){
  cb(localGet('documents'), isRecent('documents'));
  if(!isRecent('documents')) pullRemote('documents', function(err){
    if(!err) fetchDocuments(cb);
  });
}

// gets the etherpad document - contains text and all.
function fetchDocument(id, cb){
  if(id.split('$')[0] != currentUser()) return;
  var key = 'pad:'+id;
  local = localGet(key);
  if(local){local.id = id; cb(local, isRecent(key));}
  if(!isRecent(key)) pullRemote(key, function(err){
    if(!err) fetchDocument(id, cb);
  });
}

function saveDocument(doc, cb){
  var documents = localGet('documents');
  var index = localGet('index');
  var key = doc.owner+'$'+doc.link;
  documents[doc.id] = doc;
  index[key] = doc.id;
  localSet('documents', documents);
  localSet('index', index);
  async.parallel([
    function(callback) {pushRemote('documents', callback)},
    function(callback) {pushRemote('index', callback)}
  ], cb);
}

function fetchDocumentId(owner, link, cb){
  var key = owner + '$' + link;
  var done = false;
  var index = {};
  var index = localGet('index');
  if(index[key]) { cb(index[key]); return }
  getRemoteClient(owner, function(client) {
    client.get(encodeURIComponent('padInfo:'+link), function(err, data) {
      console.log('fetched public '+link+' from '+owner+':"'+err+'"');
      // if(data.movedTo)
      if(err) {//the callback should deal with a null
        cb(null);
      } else {
        saveDocument(data);
        cb(data.id);
      }
    });
  });
}

function publishDocument(doc, cb) {
  var link = doc.link;
  var key = doc.owner + '$' + doc.link;
  var index = localGet('index');
  index[key] = doc.id;
  localSet('index', index);
  pushRemote('index');

  var info = {
    id: doc.id,
    title: doc.title,
    owner: doc.owner,
    link: doc.link
  }
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
  getMyRemoteClient('public', function(client) {
    client.put('padInfo:'+link, info, function(err, data) {
      console.log('pushed info '+info+' for docLink "'+link+'" - '+err+':"'+data+'"');
      cb();
    });
  });
}

function localGet(key){
  var local = localStorage.getItem(key);
  if(local) {
    local = JSON.parse(local);
  }
  return local;
}

function localSet(key,value){
  localStorage.setItem(key, JSON.stringify(value));
  timestamps = JSON.parse(localStorage.getItem('_timestamps')||'{}')
  timestamps[key] = new Date().getTime();
  localStorage.setItem('_timestamps', JSON.stringify(timestamps));
}

function pullRemote(key, cb){
  getMyRemoteClient('documents', function (client) {
    client.get(key, function(err, data) {
      console.log('fetched '+key+' - '+err+':"'+data+'"');
      // 404 - no remote record - nothing to pull
      // 500 - ups - can't do anything about that
      if(err) { cb(err); return; }
      // merge both records
      var local = localGet(key);
      for (var i in local) { data[i] = data[i] || local[i]; }
      localSet(key, data);
      cb(null); //this is synced
    });
  });
}

function pushRemote(key, cb){
  getMyRemoteClient('documents', function (client) {
    client.put(key, localGet(key), function(err, data) {
      if(err==409){
        console.log('outdated rev for '+key+' getting new one');
        async.series([
          function(callback) { pullRemote(key, callback) }, // this will merge
          function(callback) { pushRemote(key, callback) }
        ], cb);
      } else {
        console.log('pushed '+key+' - '+err+':"'+data+'"');
        if(cb) cb();
      }
    });
  });
}

function isRecent(key, time){
  timestamps = JSON.parse(localStorage.getItem('_timestamps')||'{}')
  if(!timestamps[key]) return false;
  now = new Date().getTime();
  return now - timestamps[key] < (time || 60000);
}

function getMyRemoteClient(category, cb){
  if(!currentUser()) return;
  var sessionObj = localGet('sessionObj');
  require(['http://libredocs.org/js/remoteStorage-0.4.3.js'], function(remoteStorage) {
    var client = remoteStorage.createClient(sessionObj.storageInfo, category, sessionObj.bearerToken);
    cb(client)
  });
}

function getRemoteClient(owner, cb){
  require(['http://libredocs.org/js/remoteStorage-0.4.3.js'], function(remoteStorage) {
    getOrFetchStorageInfo(owner, function(err, ownerStorageInfo) {
      if(err) return; //TODO: might want to record this for debugging
      var client = remoteStorage.createClient(ownerStorageInfo, 'public');
      cb(client);
    });
  });
}

function getOrFetchStorageInfo(user, cb) {
  var storageOwners = localGet('storageOwners') || '{}';
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

