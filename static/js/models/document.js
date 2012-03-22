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

function saveDocumentContent(doc, cb){
  if(!doc.type.match(/^text/)) return;
  var content;
  if(doc.data){
    var encoded = doc.data.split(',')[1];
    content = Base64.decode(encoded);
  }
  if(!content) return;
  localSet('pad:'+doc.id, {text: content});
  pushRemote('pad:'+doc.id, cb);
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
    client.put('padInfo:'+doc.link, JSON.stringify(info), function(err, data) {
      console.log('pushed info '+info+' for docLink "'+doc.link+'" - '+err+':"'+data+'"');
      cb();
    });
  });
}

function uploadToDocument(file, cb) {
  var reader = new FileReader();
  reader.onload = (function(file) {
    return function(e) {
      var time = new Date().getTime();
      var owner = currentUser();
      id = owner+'$'+time;
      var doc = {
        id: id,
        title: file.name,
        data: e.target.result,
        type: file.type,
        owner: owner,
        timestamp: time
      };
      doc.link = getLinkForDocument(doc);
      saveDocument(doc, cb);
      // TODO make sure this happens before cb...
      saveDocumentContent(doc);
    }
  })(file);
  reader.readAsDataURL(file);
}

function getLinkForDocument(doc) {
  var link = doc.title.replace(/\s+/g, '-');
  // unchanged...
  if(window.getCurrDocLink && link==getCurrDocLink()) return(link);
  var main = link;
  var postfix = 0;
  var key = currentUser()+'$'+link;
  var index = localGet('index');
  while(index[key] && index[key] != doc.id) {
    postfix++;
    link = main + '-' + postfix;
    key = currentUser()+'$'+link;
  }
  return encodeURIComponent(link);
}


