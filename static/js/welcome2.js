function go() {
  document.getElementById("signin-button").style.display='none';
  document.getElementById("signin-loading").style.display='inline';
  var email = document.getElementById('email').value;
  var emailParts = email.split('@');
  if(emailParts.length == 2) {
    //cases:
    //have token -> BrowserID
    //have webfinger -> OAuth as advertised
    //is a Dutch uni -> OAuth to surfnet
    //nothing -> offer sign-up (with BrowserID)
    if(emailParts[1] == 'uva.nl') {
      localStorage.sessionObj = JSON.stringify({
        userAddress: email,
        storageInfo: {
          type: 'simple',
          auth: 'http://surf.unhosted.org:81/saml.php?userId='+email,
          template: 'http://surf.unhosted.org/'+email+'/{category}/'
        },
        state: 'allowRemoteStorage'
      });
      window.location.href = 'signin.html';
    } else {
      navigator.id.get(function(assertion) {
        if(assertion) {
          remoteStorageClient.signIn('http://libredocs.org', assertion);
          window.location.href = 'signin.html';
        }
        else {
          document.getElementById("signin-button").style.display='inline';
          document.getElementById("signin-loading").style.display='none';
        }
      }, {
        requiredEmail: email
      });
    }
  }
}

if(localStorage.getItem('sessionObj')) {
  window.location.href = 'signin.html';
}
document.getElementById('signin-button').onclick = go;
document.getElementById('signin-loading').style.display='none';
document.getElementById('signin-button').style.display='inline';

(function($) {
  $(document).ready(function() {
    $('#signin').tooltip();
    $('.signin').onmouseover=$('#signin').tooltip('show');
  });
})(jQuery);
