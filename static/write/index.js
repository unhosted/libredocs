// So far this will connect to the default etherpad server.
// This is just a test for the editor embedding
function connectToOwnpad() {
  var pad = getPad();

  // 
  if(isOwnPad(pad))
  {
    showPreview(pad.text);
    ensureCouchHost();
  }

  document.getElementsByTagName('h1')[0].innerHTML = docTitleSpan(pad) + signupStatus();
  embedPad(pad);
}
function showPreview(text) {
  $('#previewPad').text(text);
  window.onblur = function()
  {
    $('#previewPad').hide();
  };
}
function docTitleSpan(pad) {
  if(isOwnPad(pad))
  {
    return '<span id="docTitle" onmouseover="changeDocTitle();">'+pad.title+'</span>';
  }
  else
  {
    return '<span id="docTitle">'+pad.title+'</span>';
  }
}
function signupStatus() {
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
  // not signed in
  if(sessionObj == null || !sessionObj.userAddress) 
  {
    return '<small><input type="submit" value="Sign in" onclick="location=\'/\';"></small>';
  }
  else
  {
    return '<small> '+sessionObj.userAddress
    +'<a class="btn btn-danger" href="#" onclick="localStorage.clear();location=\'/\';"><i class="icon-remove icon-white"></i> Sign out</a>'
    +'</small>'
  }
}
function ensureCouchHost() {
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
  //deal with legacy accounts:
  if(!sessionObj.couchHost) {
    sessionObj.couchHost = sessionObj.subdomain+'.iriscouch.com';
    localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
  }
}
function embedPad(pad) {
  $('#editorPad').pad({
    'padId':encodeURIComponent(pad.id),
    'userName':hyphenify(getUserName()),
  });
}
function getUserName() {
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj')) || {};
  return sessionObj.userAdress || 'unknown';
}
function isOwnPad(pad) {
  pad.owner == hyphenify(getUserName());
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
  // haven't found the pad in our documents list - use url params
  return {
    owner: getCurrDocOwner(),
    id: getCurrDocOwner()+'$'+getCurrDocLink(),
    title: getCurrDocLink(),
  };
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
