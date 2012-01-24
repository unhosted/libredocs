function go() {
  document.getElementById("signin-button").style.display='none';
  document.getElementById("signin-loading").style.display='block';
  navigator.id.get(function(assertion) {
    if(assertion) {
      remoteStorageClient.signIn('http://libredocs.org', assertion);
      window.location='loggedIn.html';
    }
    else {
      document.getElementById("signin-button").style.display='block';
      document.getElementById("signin-loading").style.display='none';
    }
  });
}

document.getElementById('signin-button').onclick = go;
document.getElementById('signin-loading').style.display='none';
document.getElementById('signin-button').style.display='block';
