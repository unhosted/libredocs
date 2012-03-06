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
        var doc = (typeof(data)=="string") ? JSON.parse(data) : data;
        saveDocument(doc);
        cb(doc.id);
      }
    });
  });
}

function publishDocument(doc, cb) {
  var info = {
    id: doc.id,
    title: doc.title,
    owner: doc.owner,
    link: doc.link
  }
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
  getMyRemoteClient('public', function(client) {
    client.put('padInfo:'+doc.link, info, function(err, data) {
      console.log('pushed info '+info+' for docLink "'+doc.link+'" - '+err+':"'+data+'"');
      cb();
    });
  });
}
