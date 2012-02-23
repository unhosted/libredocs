function signin() {
  document.getElementById("signin-button").style.display='none';
  document.getElementById("signin-checking").style.display='inline';
  var email = document.getElementById('email').value;
  navigator.id.get(function(assertion) {
    if(assertion) {
      remoteStorageClient.signIn('http://libredocs.org', assertion);
      window.location.href = 'signin.html';
    }
  }, {
    requiredEmail: email
  });
}
function allow() {
  window.location.href = 'signin.html';
}
function couldBeEmail(str) {
  return /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/.test(str);
}
function checkEmail() {
  document.getElementById('allow-button').style.display='none';
  document.getElementById('signin-button').style.display='none';
  var email = document.getElementById('email').value;
  if(!couldBeEmail(email)) {
   return;
  }
  document.getElementById('signin-checking').style.display='inline';
  require(['http://unhosted.org/remoteStorage-0.4.3.js'], function(remoteStorage) {
    remoteStorage.getStorageInfo(email, function(err, storageInfo) {
      if(err) {
        document.getElementById('signin-checking').style.display='none';
        document.getElementById('signin-button').style.display='inline';
        document.getElementById('allow-button').style.display='none';
      } else {
        var email = document.getElementById('email').value;
        var sessionObj = { 
          userAddress: email,
          storageInfo: storageInfo,
          state: 'allowRemoteStorage'
        };
        localStorage.sessionObj = JSON.stringify(sessionObj);
        document.getElementById('signin-checking').style.display='none';
        document.getElementById('allow-button').style.display='inline';
        document.getElementById('signin-button').style.display='none';
      }
    });
  });
}

if(localStorage.getItem('sessionObj')) {
  window.location.href = 'signin.html';
}
document.getElementById('signin-button').onclick = signin;
document.getElementById('allow-button').onclick = allow;
document.getElementById('email').onkeyup = checkEmail;

(function($) {
  $(document).ready(function() {
    $('#signin').tooltip();
    $('.signin').onmouseover=$('#signin').tooltip('show');
  });
})(jQuery);
