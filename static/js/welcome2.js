function getClientSideFakeFinger(email) {
  var emailParts = email.split('@');
  if(emailParts.length == 2) {
    if(['uva.nl', 'unhosted.org', 'surf.unhosted.org'].indexOf(emailParts[1]) != -1) {
      return {
        userAddress: email,
        storageInfo: {
          type: 'simple',
          auth: 'http://surf.unhosted.org:81/saml.php?user_id='+email,
          template: 'http://surf.unhosted.org/'+email+'/{category}/'
        },
        state: 'allowRemoteStorage'
      };
    }
  }
  return false;
}
function go() {
  document.getElementById("signin-button").style.display='none';
  document.getElementById("signin-loading").style.display='inline';
  var email = document.getElementById('email').value;
  //cases:
  //have token -> BrowserID
  //have webfinger -> OAuth as advertised
  //is a Dutch uni -> OAuth to surfnet
  //nothing -> offer sign-up (with BrowserID)
  var clientSideFakeFinger = getClientSideFakeFinger(email);
  if(clientSideFakeFinger) {
    localStorage.sessionObj = JSON.stringify(clientSideFakeFinger);
    window.location.href = 'signin.html';
  } else {
    require(['http://unhosted.org/remoteStorage-0.4.3.js'], function(remoteStorage) {
      remoteStorage.getStorageInfo(email, function(err, storageInfo) {
        if(err) {
          navigator.id.get(function(assertion) {
            if(assertion) {
              remoteStorageClient.signIn('http://libredocs.org', assertion);
              window.location.href = 'signin.html';
            } else {
              document.getElementById("signin-button").style.display='inline';
              document.getElementById("signin-loading").style.display='none';
            }
          }, {
            requiredEmail: email
          });
        } else {
          var sessionObj = { 
            userAddress: email,
            storageInfo: storageInfo,
            state: 'allowRemoteStorage'
          };
          localStorage.sessionObj = JSON.stringify(sessionObj);
          window.location.href = 'signin.html';
        }
      });
    });
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
