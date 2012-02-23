(function(){
  init();

})()

function init() {
  window.onpopstate = function(event) {
    // see what is available in the event object
    console.log(event);
    loadView();
  }
  // make sure we throw no errors in old browsers
  if(!window.localStorage || !history.pushState) {
    window.location.href = 'missing.html';
    return;
  }

  if(location.pathname.length < 2) {
    if(localStorage.documents && localStorage.documents.length > 2){
      loadDocuments();
    }
    else { 
      loadWelcome();
    }
  }
  
  // pathname specific init goes here.
}

function loadDocuments() {
  history.pushState({view: "documents"}, "Libre Docs Document List", "");
  if(window.loadView) loadView();
}

function loadWelcome() {
  history.pushState({view: "welcome"}, "Welcome to Libre Docs", "");
  if(window.loadView) loadView();
}


