define(function() {
  var sessionObj;
  function signin() {
    alert('Sorry! we\'re updating this part of Libre Docs right now. Come to our chatroom and we\'ll sign you up: http://webchat.freenode.net/?channels=unhosted');
    return;
    document.getElementById("signin-button").style.display='none';
    document.getElementById("check-button").style.display='inline';
    var email = document.getElementById('email').value;
    navigator.id.get(function(assertion) {
      if(assertion) {
        remoteStorageClient.signIn('http://'+location.host, assertion);
      }
    }, {
      requiredEmail: email
    });
  }
  function storeBearerToken(userAddress, bearerToken, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/storeBearerToken', true);
    xhr.onreadystatechange = function() {
      if(xhr.readyState==4) {
        if(xhr.status==201) {
          cb(true);
        } else {
          cb(false);
        }
      }
    };
    xhr.send(JSON.stringify({
      userAddress: userAddress,
      bearerToken: bearerToken
    }));
  }
  function allow() {
    if(!sessionObj) {
      sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
    }
    if(sessionObj.storageInfo.auth.indexOf('?') == -1) {
      window.open(sessionObj.storageInfo.auth
        +'?redirect_uri='+encodeURIComponent('http://'+location.host+'/rcvToken.html')
        +'&scope='+encodeURIComponent('documents,public,contacts'));
    } else {
      window.open(sessionObj.storageInfo.auth
          +'&redirect_uri='+encodeURIComponent('http://'+location.host+'/rcvToken.html')
          +'&scope='+encodeURIComponent('documents,public,contacts'));
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
        storeBearerToken(sessionObj.userAddress, sessionObj.bearerToken, function(result) {
          if(result) {
            init();
            load();
          } else {
            alert('no, that didn\'t work, sorry');
          }
        });
      }
    }, false);
  }
  function couldBeEmail(str) {
    return /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/.test(str);
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
    require(['./js/remoteStorage-0.4.5'], function(remoteStorage) {
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

  function loaded() {
    setTimeout(function() {
      document.getElementById('signin-button').onclick = signin;
      document.getElementById('allow-button').onclick = allow;
      document.getElementById('check-button').onclick = check;
      document.getElementById('email').onkeyup = showCheckButton;
    }, 100);//TODO: Gotta find a way, a better way, I'd better wait(x2)
    $('#current-state').on('click', '#agree-button', remoteStorageClient.agree);
    $('#current-state').on('click', '#allow-button', remoteStorageClient.allow);
    $('#signin').tooltip();
    $('.signin').onmouseover=$('#signin').tooltip('show');
  }

  return {
    loaded: loaded
  };
});
