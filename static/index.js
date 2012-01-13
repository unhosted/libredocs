function go() {
  document.getElementById("signin-button").style.display='none';
  document.getElementById("signin-loading").style.display='block';
  navigator.id.get(function(assertion) {
    remoteStorageClient.signIn('http://libredocs.org', assertion);
    window.location='loggedIn.html';
  });
}

document.getElementById('signin-button').setAttribute('onclick', 'go();');
document.getElementById('signin-loading').style.display='none';
document.getElementById('signin-button').style.display='block';
