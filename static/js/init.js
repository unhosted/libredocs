(function(){
  init();

})()

function init() {
  window.onpopstate = function(event) {
    // see what is available in the event object
    console.log(event);
    initView(selectView(), event.state);
    //onpopstate is called after dom loaded
    loaded(selectView(), event.state);
  }
  // make sure we throw no errors in old browsers
  if(!window.localStorage || !history.pushState) {
    window.location.href = 'missing.html';
    return;
  }
  getDocFromHash(function(doc) {
    initView(selectView(), doc);
  });
}

function initView(view, doc) {
  getScripts(view, function(script) {
    if(script.init) script.init(doc);
  });
}

function selectView() {
  // document in the path
  if(location.hash.split('/').length > 2) {
    return 'documents';
  }
  return isLoggedIn() ? 'documents' : 'welcome' ;
}

function getDocFromHash(cb) {
  var hashed = location.hash.split('/');
  hashed.shift();
  if(hashed.length < 2) {cb(); return;}
  var owner = hashed.shift();
  var link = hashed.join('/');
  fetchDocumentId(owner, link, function(id) {
    var documents = localGet('documents');
    if(id && documents[id]) {
      documents[id].timestamp = new Date().getTime();
      localSet('documents', documents);
      cb(documents[id]);
    } else {
      cb();
    }
  });
}

function isLoggedIn() {
  var sessionObj = localStorage.sessionObj;
  return (sessionObj && JSON.parse(sessionObj).state == 'ready');
}

function getScripts(view, cb) {
  require(['./js/'+view], cb);
}
