// So far this will connect to the default etherpad server.
// This is just a test for the editor embedding
function connectToOwnpad() {
  var userName;
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
  var pad = getPad();

  if(pad == null)
  {
    alert("Document could not be found - please specify owner and title");
    return;
  }

  // not logged in
  if(sessionObj == null || sessionObj.userAddress == null) 
  {
    document.getElementsByTagName('h1')[0].innerHTML =
      '<span id="docTitle">'+pad.title+'</span><small> by '+getCurrDocOwner()
      +'<input type="submit" value="Login" onclick="localStorage.clear();location=\'/\';">'
      +'</small>';
    embedSharedPad(pad.id, "unknown");
    return;
  }
  
  userName = hyphenify(sessionObj.userAddress);
  
  if(pad.owner != userName)
  {
    document.getElementsByTagName('h1')[0].innerHTML =
      '<span id="docTitle">'+pad.title+'</span><small>'+(sessionObj.userAddress?' '+sessionObj.userAddress:'')
      +'<input type="submit" value="Logout" onclick="localStorage.clear();location=\'/\';">'
      +'</small>';
    embedSharedPad(pad.id, userName);
  }
  else
  {
    document.getElementsByTagName('h1')[0].innerHTML =
      '<span id="docTitle" onmouseover="changeDocTitle();">'+pad.title+'</span><small>'+(sessionObj.userAddress?' '+sessionObj.userAddress:'')
      +'<input type="submit" value="Logout" onclick="localStorage.clear();location=\'/\';">'
      +'</small>';
    embedOwnPad(pad.id);
  }
}

function embedOwnPad(padId)
{
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
  $('#editorPad').pad({
    'padId':encodeURIComponent(padId),
    'host':'http://ownpad.nodejitsu.com',
    'storageAddress':encodeURIComponent('https://'+sessionObj.subdomain+'.iriscouch.com/documents/'),
    'bearerToken':encodeURIComponent(sessionObj.bearerToken),
    'storageApi':sessionObj.storageApi,
    'userName':hyphenify(sessionObj.userAddress),
    'showControls':true,
    'showLineNumbers':false
  });
}

function embedSharedPad(padId, userName)
{
  $('#editorPad').pad({
    'padId':encodeURIComponent(padId),
    'host':'http://ownpad.nodejitsu.com',
    'userName':hyphenify(userName),
    'showControls':true,
    'showLineNumbers':false
  });
}

var editingDocTitle;
function changeDocTitle() {
  if(!editingDocTitle) {
    editingDocTitle = true;
    document.getElementById('docTitle').innerHTML = '<input id="docTitleInput" onblur="saveDocTitle();" type="text" value="'+getPad().title+'" />';
  }
}
function saveDocTitle() {
  editingDocTitle = false;
  var pad = getPad();
  pad.title = document.getElementById('docTitleInput').value;
  pad.link = getLinkFromTitle(pad.title);
  var list = JSON.parse(localStorage.getItem('list'));
  list[pad.id] = pad;
  localStorage.setItem('list',JSON.stringify(list));
  location.hash = '#!/'+getCurrDocOwner()+'/'+pad.link;
  document.getElementById('docTitle').innerHTML = pad.title;
}
function getCurrDocOwner() {
  return location.hash.split('/')[1];
}
function getCurrDocLink() {
  return location.hash.split('/')[2];
}
function getPad() {
  var list = JSON.parse(localStorage.getItem('list'));
  for(i in list)
  {
    if (list[i].link == getCurrDocLink() && list[i].owner == getCurrDocOwner())
    {
      return list[i];
    }
  }
}

// TODO: make sure this is unique
function getLinkFromTitle(title) {
  title = title.replace(/\s+/g, '-');
  return encodeURIComponent(title);
}

function hyphenify(userAddress) {
  return userAddress.replace(/-/g, '-dash-').replace(/@/g, '-at-').replace(/\./g, '-dot-');
}

document.getElementsByTagName('body')[0].setAttribute('onload', 'connectToOwnpad();');
document.getElementById('loading').style.display='none';
