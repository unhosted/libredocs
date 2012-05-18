define(function() {
  function storeBearerToken(userAddress, bearerToken, cb) {
    var host = 'http://ownpad.unhosted.org:82';
    var api = '/api/1/';
    var method = 'connect';
    var params = { userAddress: userAddress,
      bearerToken: bearerToken };
    var query = [];
    for(var k in params) {
      query.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
    }
    var url = host+api+method+'?'+ query.join('&')
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function() {
      if(xhr.readyState==4) {
        if(xhr.status==201 || xhr.status==200) {
          cb(true);
        } else {
          cb(false);
        }
      }
    };
    xhr.send();
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
    localStorage.setItem('_unhosted$userAddress', userAddress);
    localStorage.setItem('_unhosted$categories', JSON.stringify(categories));
    window.open(libPath+'/dialog.html');
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

  var registered = false;
  window.addEventListener('storage', function(event) {
    if(registered) {
      return;
    } else {
      registered = true;
    }
    if(event.key=='_unhosted:dialogResult' && event.newValue) {
      var result, storageInfo, bearerToken;
      try{
        result = JSON.parse(event.newValue);
        storageInfo = JSON.parse(localStorage.getItem('_unhosted$storageInfo'));
      } catch(e) {
        alert('dialog did not go well');
        return;
      }
      bearerToken = localStorage.getItem('_unhosted$bearerToken');
      connected(result.err, storageInfo, bearerToken);
    }
  }, false);

  return {
    loaded: loaded
  };
});
