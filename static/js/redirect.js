if(location.hash.length == 0) {
  if(localStorage.documents && localStorage.documents.length > 2){
    window.location.href = 'documents.html';
  }
  else { 
    window.location.href = 'welcome.html';
  }
}
