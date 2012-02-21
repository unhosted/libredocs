(function() {
  // make sure we throw no errors in old browsers
  if(!window.localStorage) {
    window.location.href = 'welcome.html';
    return;
  }

  if(location.hash.length == 0) {
    if(localStorage.documents && localStorage.documents.length > 2){
      window.location.href = 'documents.html';
    }
    else { 
      window.location.href = 'welcome.html';
    }
  }
})()
