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
  initView(selectView());
}

function initView(view, doc) {
  getScripts(view, function(script) {
    if(script.init) script.init(doc);
  });
}

function selectView() {
  // document in the path
  if(location.pathname.length > 2) {
    return 'documents';
  }
  return isLoggedIn() ? 'documents' : 'welcome' ;
}

function isLoggedIn() {
  var sessionObj = localStorage.sessionObj;
  return (sessionObj && JSON.parse(sessionObj).state == 'ready');
}

function getScripts(view, cb) {
  require(['http://libredocs.org/js/'+view+'.js'], cb);
}
