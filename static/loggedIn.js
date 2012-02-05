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

document.getElementById('body').setAttribute('onload', 'remoteStorageClient.checkForLogin();');
document.getElementById('agree-button').setAttribute('onclick', 'remoteStorageClient.agree();');

