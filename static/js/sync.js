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
      if(typeof(data)=="string") data = JSON.parse(data);
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
  require(['./js/remoteStorage-0.4.5'], function(remoteStorage) {
    var client = remoteStorage.createClient(sessionObj.storageInfo, category, sessionObj.bearerToken);
    cb(client)
  });
}

function getRemoteClient(owner, cb){
  require(['./js/remoteStorage-0.4.5'], function(remoteStorage) {
    getOrFetchStorageInfo(owner, function(err, ownerStorageInfo) {
      if(err) return; //TODO: might want to record this for debugging
      var client = remoteStorage.createClient(ownerStorageInfo, 'public');
      cb(client);
    });
  });
}

function getOrFetchStorageInfo(user, cb) {
  setOwnStorageInfo();
  var storageOwners = localGet('storageOwners') || {};
  if(storageOwners[user]) {
    cb(null, storageOwners[user]);
    return;
  }
  require(['./js/remoteStorage-0.4.5'], function(remoteStorage) {
    remoteStorage.getStorageInfo(user, function(err, storageInfo){
      storageOwners[user] = storageInfo;
      localStorage.setItem('storageOwners', JSON.stringify(storageOwners));
      cb(null, storageInfo);
    });
  });
}

function setOwnStorageInfo() {
  var storageOwners = localGet('storageOwners') || {};
  if(!localStorage.sessionObj) return;
  var sessionObj = JSON.parse(localStorage.sessionObj);
  var currentUser = sessionObj.userAddress
  if(!storageOwners[currentUser]) {
    storageOwners[currentUser] = sessionObj.storageInfo
  }
  localSet('storageOwners', storageOwners);
}
