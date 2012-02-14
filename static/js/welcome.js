function go() {
  document.getElementById("signin-button").style.display='none';
  document.getElementById("signin-loading").style.display='inline';
  navigator.id.get(function(assertion) {
    if(assertion) {
      remoteStorageClient.signIn('http://libredocs.org', assertion);
      window.location='signin.html';
    }
    else {
      document.getElementById("signin-button").style.display='inline';
      document.getElementById("signin-loading").style.display='none';
    }
  });
}

if(localStorage.getItem('sessionObj')) {
  window.location = 'signin.html';
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
