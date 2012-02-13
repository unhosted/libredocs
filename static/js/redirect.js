if(location.hash.length == 0) {
  if(localStorage.documents && localStorage.documents.length > 2){
    window.location = '/documents.html';
  }
  else { 
    window.location = '/welcome.html';
  }
}
