var alertMessage = function(heading, message, debug) {
  var pretty;
  document.getElementById('error-heading').innerHTML = heading;
  document.getElementById('error-message').innerHTML = message;
  if(debug){
    if (typeof debug === 'object'){
      pretty = JSON.stringify(debug,null, 2)
    }
    document.getElementById('error-debug').innerHTML = pretty || debug;
  }
  document.getElementById('error').style.display = 'block';
}
var showDebug = function() {
  document.getElementById('error-debug').style.display = 'block';
}
remoteStorageClient.on('status', function(status) {
  document.getElementsByTagName('small')[0].innerHTML = (status.userAddress?' '+status.userAddress:'');
  for(i in status.buttons) {
    document.getElementsByTagName('small')[0].innerHTML += '<a class="btn btn-danger" href="#" onclick="remoteStorageClient.'+status.buttons[i]+'();"><i class="icon-remove icon-white"></i> '+status.buttons[i]+'</a>';
  }
  if(status.step) {
    document.getElementById('easyfreedom-loading').style.display = 'block';
    document.getElementById('easyfreedom-loadingbar').style.width = status.loadingBar+'%';
    document.getElementById('easyfreedom-loadingtext').innerHTML = status.step;
  } else {
    document.getElementById('easyfreedom-loading').style.display = 'none';
  }
});

document.getElementById('signup').setAttribute('onload', 'remoteStorageClient.checkForLogin();');
document.getElementById('agree-button').setAttribute('onclick', 'remoteStorageClient.agree();');
