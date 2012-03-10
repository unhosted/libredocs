define(function() {
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
    var email=document.getElementById('email').value.split('@');
    var userAddressParts=email.split('@');
    if(userAddressParts.length!=2) {
      alert('Your user address should have an \'@\'-sign in it, like e.g. peter@pan.com');
      return;
    }
    if(userAddressParts[0].indexOf('+') != -1) {
      email = userAddressParts[0].substring(0,userAddressParts[0].indexOf('+'));
      alert('Using \''+email+'\' as your user address, the part behind the \'+\' is irrelevant here.');
    }
    connect(email, ['documents', 'contacts', 'public'], function(err, storageInfo, token) {
      var emailParts
      if(err) {
        alert('Sorry, that didn\'t work. Try signing up at 5apps.com or owncube.com, and then come back here and log in with [user]@[provider]');
      } else {
        var sessionObj;
        try {
          sessionObj = JSON.parse(localStorage.sessionObj);
        } catch(e) {
        }
        if(!sessionObj) {
          sessionObj={};
        }
        sessionObj.bearerToken = token;
        sessionObj.state = 'ready';
        sessionObj.proxy = '';
        sessionObj.clientSide = true;//prevents storing with migration fields in account.js
        localStorage.sessionObj = JSON.stringify(sessionObj);
        storeBearerToken(sessionObj.userAddress, sessionObj.bearerToken, function(result) {
          if(result) {
            init();
            load();
          } else {
            alert('Sorry, that didn\'t work. Try signing up at 5apps.com or owncube.com, and then come back here and log in with [user]@[provider]');
          }
        });
      }
    }, false);
  }
  function connect(userAddress, categories, cb) {
    var libPath = '';
    window.open(libPath+'/openDialog.html'
      +'?userAddress='+encodeURIComponent(userAddress)
      +'&categories='+encodeURIComponent(JSON.stringify(categories))
      +'&libPath='+encodeURIComponent(libPath));
    window.addEventListener('message', function(event) {
      if(event.origin == location.protocol +'//'+ location.host) {
        if(event.data.substring(0, 5) == 'conn:') {
          var data = JSON.parse(event.data.substring(5));
          cb(data.storageInfo, data.bearerToken);
        }
      }
    }, false);
  }
  function loaded() {
    setTimeout(function() {
      document.getElementById('allow-button').onclick = allow;
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
