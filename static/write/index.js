// So far this will connect to the default etherpad server.
// This is just a test for the editor embedding
function connectToOwnpad() {
  var userName, padId;
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
  document.getElementsByTagName('h1')[0].innerHTML =
    '<span id="docTitle" onclick="changeDocTitle();"><strong>'+getCurrDocName()+'</strong></span><small>'+(sessionObj.userAddress?' '+sessionObj.userAddress:'')
    +'<input type="submit" value="Logout" onclick="localStorage.clear();location=\'/\';">'
    +'</small>';
  if(sessionObj.userAddress != null) {
    userName = sessionObj.userAddress;
    } else {
    userName = 'Address Not Set Yet'
  }
  if(getCurrDocName() != null) {
    padId = docNameToPadId(getCurrDocName());
    } else {
    padId = 'still-hosted-no-name'
  }
  $('#editorPad').pad({
    'padId':padId,
    'host':'http://ownpad.nodejitsu.com',
    'storageAddress':'https://'+sessionObj.subdomain+'.iriscouch.com/documents/',
    'bearerToken':sessionObj.bearerToken,
    'storageApi':sessionObj.storageApi,
    'userName':userName,
    'showControls':true,
    'showLineNumbers':false,
  });
}
function changeDocTitle() {
  alert('In the future we will let you change this document title');
}
function getCurrDocName() {
  return location.hash.split('/')[2];
}
function docNameToPadId(docName) {
  return docName;
}

document.getElementsByTagName('body')[0].setAttribute('onload', 'connectToOwnpad();');
document.getElementById('loading').style.display='none';
