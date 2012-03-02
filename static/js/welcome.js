define(function() {
  var sessionObj;
  function signin() {
    document.getElementById("signin-button").style.display='none';
    document.getElementById("signin-checking").style.display='inline';
    var email = document.getElementById('email').value;
    navigator.id.get(function(assertion) {
      if(assertion) {
        remoteStorageClient.signIn('http://'+location.host, assertion);
      }
    }, {
      requiredEmail: email
    });
  }
  function allow() {
    if(!sessionObj) {
      sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
    }
    if(sessionObj.storageInfo.auth.indexOf('?') == -1) {
      window.open(sessionObj.storageInfo.auth
        +'?redirect_uri='+encodeURIComponent('http://'+location.host+'/rcvToken.html')
        +'&scope='+encodeURIComponent('documents'));
    } else {
      window.open(sessionObj.storageInfo.auth
          +'&redirect_uri='+encodeURIComponent('http://'+location.host+'/rcvToken.html')
          +'&scope='+encodeURIComponent('documents'));
    }
    window.addEventListener('message', function(event) {
      if(event.origin == location.protocol +'//'+ location.host) {
        if(!sessionObj) {
          sessionObj = JSON.parse(localStorage.sessionObj);
        }
        sessionObj.bearerToken = event.data;
        sessionObj.state = 'ready';
        sessionObj.proxy = '';
        sessionObj.clientSide = true;//prevents storing with migration fields in account.js
        localStorage.sessionObj = JSON.stringify(sessionObj);
        init();
        load();
      }
    }, false);
  }
  function couldBeEmail(str) {
    return /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/.test(str);
  }
  function checkResumableSession(email, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/userExists', true);
    xhr.onreadystatechange = function() {
      if(xhr.readyState == 4) {
        cb((xhr.status == 200));
      }
    }
    xhr.send(email);
  }
  function showCheckButton() {
    document.getElementById('allow-button').style.display='none';
    document.getElementById('signin-button').style.display='none';
    document.getElementById('check-button').style.display='inline';
  }
  function check() {
    var email = document.getElementById('email').value;
    if(!couldBeEmail(email)) {
      return;
    }
    document.getElementById('check-button').style.display='none';
    checkResumableSession(email, function(isResumable) {
      if(isResumable) {
        document.getElementById('check-button').style.display='none';
        document.getElementById('signin-button').style.display='inline';
        document.getElementById('allow-button').style.display='none';
      } else {
        require(['./js/remoteStorage-0.4.4'], function(remoteStorage) {
          remoteStorage.getStorageInfo(email, function(err, storageInfo) {
            if(err) {
              document.getElementById('check-button').style.display='none';
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
              $('#check-button').css('display','none');
              $('#allow-button').css('display','inline');
              document.getElementById('signin-button').style.display='none';
            }
          });
        });
      }
    });
  }

  function loaded() { 
    document.getElementById('signin-button').onclick = signin;
    document.getElementById('allow-button').onclick = allow;
    document.getElementById('check-button').onclick = check;
    document.getElementById('email').onkeyup = showCheckButton;
    $('#current-state').on('click', '#agree-button', remoteStorageClient.agree);
    $('#current-state').on('click', '#allow-button', remoteStorageClient.allow);
    $('#signin').tooltip();
    $('.signin').onmouseover=$('#signin').tooltip('show');
  }

  return {
    loaded: loaded
  };
});
