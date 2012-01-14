// this is probably not working anymore
window.addEventListener('storage', function(e) {
  if(e.key=='LibreDocsState') {
    console.log('LibreDocsState '+e.newValue+' received');
    if(e.newValue == 'exit') {
      window.close();
    } else if(e.newValue == 'offline') {
      document.getElementById('spinner').style.display='block';
    } else {
      document.getElementById('spinner').style.display='none';
    }
  } else if(e.key == 'LibreDocsUserAddress') {
    connectToOwnpad();
  }
}, false);
// So far this will connect to the default etherpad server.
// This is just a test for the editor embedding
function connectToOwnpad() {
  var userName, padId;
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
  if(sessionObj.userAddress != null) {
    userName = sessionObj.userAddress;
    } else {
    userName = 'Address Not Set Yet'
  }
  if(sessionObj.currDocId != null) {
    padId = sessionObj.currDocId;
    } else {
    padId = 'still-hosted-no-name'
  }
  $('#editorPad').pad({
    'padId':padId,
    'host':'http://ownpad.nodejitsu.com',
    'storageAddress':sessionObj.storageAddress,
    'bearerToken':sessionObj.bearerToken,
    'storageApi':sessionObj.storageApi,
    'userName':userName,
    'showControls':true,
    'showLineNumbers':true,
    //we'll hopefully send the storage data here at some point.
  });
}
document.getElementsByTagName('body')[0].setAttribute('onload', 'connectToOwnpad();');
document.getElementById('loading').style.display='none';
