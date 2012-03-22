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
    var email=document.getElementById('connect-address').value;
    var userAddressParts=email.split('@');
    if(userAddressParts.length!=2) {
      alert('Your user address should have an \'@\'-sign in it, like peter@pan.com');
      return;
    }
    if(userAddressParts[0].indexOf('+') != -1) {
      email = userAddressParts[0].substring(0,userAddressParts[0].indexOf('+'));
      alert('Using \''+email+'\' as your user address, the part behind the \'+\' is irrelevant here.');
    }
    connect(email, ['documents', 'contacts', 'public']);
  }

  function connected(err, storageInfo, token) {
    email=document.getElementById('connect-address').value;
    var emailParts
    if(err) {
      alert('Sorry, that didn\'t work. Try signing up at 5apps.com or owncube.com, and then come back here and connect with [user]@[provider]');
      return;
    }
    document.getElementById('connect-address').disabled=true;
    document.getElementById('connect-address').style.background='url("../images/loading.gif") no-repeat 1em center';
    document.getElementById('connect-button').style.display='none';
    var sessionObj;
    try {
      sessionObj = JSON.parse(localStorage.sessionObj);
    } catch(e) {
    }
    if(!sessionObj) {
      sessionObj={};
    }
    sessionObj.userAddress=email;
    sessionObj.storageInfo=storageInfo;
    sessionObj.bearerToken = token;
    sessionObj.state = 'ready';
    sessionObj.proxy = '';
    sessionObj.clientSide = true;//prevents storing with migration fields in account.js
    storeBearerToken(sessionObj.userAddress, sessionObj.bearerToken, function(result) {
      if(result) {
        localStorage.sessionObj = JSON.stringify(sessionObj);
        init();
        load();
      } else {
        document.getElementById('connect-address').disabled=false;
        document.getElementById('connect-address').style.background='none';
        document.getElementById('connect-button').style.display='inline';
        alert('Sorry, that looks like an issue. Please come to http://webchat.freenode.net/?channels=unhosted and tell us about it');
      }
    });
  }

  function connect(userAddress, categories) {
    var libPath = '';
    window.open(libPath+'/openDialog.html'
        +'?userAddress='+encodeURIComponent(userAddress)
        +'&categories='+encodeURIComponent(JSON.stringify(categories))
        +'&libPath='+encodeURIComponent(libPath));
  }

  function loaded() {
    setTimeout(function() {
      var connectButton = $('#connect-button');
      if(connectButton.attr('data-state') != 'active') {
        connectButton.on('click', allow);
        connectButton.attr('data-state', 'active');
      }
    }, 100);
  }

  window.addEventListener('message', function(event) {
    if(event.origin == location.protocol +'//'+ location.host) {
    if(event.data.substring(0, 5) == 'conn:') {
      var data = JSON.parse(event.data.substring(5));
      connected(data.err, data.storageInfo, data.bearerToken);
    }
  }
  }, false);

  return {
    loaded: loaded
  };
});
