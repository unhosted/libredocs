// So far this will connect to the default etherpad server.
// This is just a test for the editor embedding
function connectToOwnpad() {
  var userName, padId;
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));

  if(getCurrDocName() != null) {
    padId = docNameToPadId(getCurrDocName());
    } else {
    padId = 'still-hosted-no-name';
  }

  // not logged in
  if(sessionObj == null || sessionObj.userAddress != null) 
  {
    document.getElementsByTagName('h1')[0].innerHTML =
      '<span id="docTitle">'+getCurrDocName()+'</span><small> by '+getCurrDocOwner()
      +'<input type="submit" value="Login" onclick="localStorage.clear();location=\'/\';">'
      +'</small>';
    embedSharedPad(getCurrDocOwner(), padId);
    return;
  }
  
  userName = hyphenify(sessionObj.userAddress);
  
  if(getCurrDocOwner() != userName)
  {
    document.getElementsByTagName('h1')[0].innerHTML =
      '<span id="docTitle">'+getCurrDocName()+'</span><small>'+(sessionObj.userAddress?' '+sessionObj.userAddress:'')
      +'<input type="submit" value="Logout" onclick="localStorage.clear();location=\'/\';">'
      +'</small>';
    embedSharedPad(getCurrDocOwner(), padId);
  }
  else
  {
    document.getElementsByTagName('h1')[0].innerHTML =
      '<span id="docTitle" onmouseover="changeDocTitle();">'+getCurrDocName()+'</span><small>'+(sessionObj.userAddress?' '+sessionObj.userAddress:'')
      +'<input type="submit" value="Logout" onclick="localStorage.clear();location=\'/\';">'
      +'</small>';
    embedOwnPad(padId);
  }
}

function embedOwnPad(padId)
{
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
  $('#editorPad').pad({
    'padId':padId,
    'host':'http://ownpad.nodejitsu.com',
    'storageAddress':'https://'+sessionObj.subdomain+'.iriscouch.com/documents/',
    'bearerToken':sessionObj.bearerToken,
    'storageApi':sessionObj.storageApi,
    'userName':hyphenify(sessionObj.userAddress),
    'showControls':true,
    'showLineNumbers':false
  });
}

function embedSharedPad(owner, padId)
{
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
  $('#editorPad').pad({
    'padId': owner + '$' + padId,
    'host':'http://ownpad.nodejitsu.com',
    'userName':sessionObj.userAddress,
    'showControls':true,
    'showLineNumbers':false
  });
}

var editingDocTitle;
function changeDocTitle() {
  if(!editingDocTitle) {
    editingDocTitle = true;
    document.getElementById('docTitle').innerHTML = '<input id="docTitleInput" onblur="saveDocTitle();" type="text" value="'+getCurrDocName()+'" />';
  }
}
function saveDocTitle() {
  editingDocTitle = false;
  location.hash = '#!/'+getCurrDocOwner()+'/'+document.getElementById('docTitleInput').value;
  document.getElementById('docTitle').innerHTML = document.getElementById('docTitleInput').value;
}
function getCurrDocOwner() {
  return location.hash.split('/')[1];
}
function getCurrDocName() {
  return location.hash.split('/')[2];
}
function docNameToPadId(docName) {
  return docName;
}

function hyphenify(userAddress) {
  return userAddress.replace(/-/g, '-dash-').replace(/@/g, '-at-').replace(/\./g, '-dot-');
}

document.getElementsByTagName('body')[0].setAttribute('onload', 'connectToOwnpad();');
document.getElementById('loading').style.display='none';
