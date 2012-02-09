function getPadId(cb) {
  var link = getCurrDocOwner()+'$'+getCurrDocLink();
  var links2Id = JSON.parse(localStorage.getItem('links2id') || '{}')
  if(links2Id[link])
  {
    cb(links2Id[link]);
    return;
  }
  fetchPadId(getCurrDocOwner(), getCurrDocLink(), function(id)
  {
    links2Id[link] = id;
    localStorage.setItem('links2id', JSON.stringify(links2Id));
    cb(id);
  });
}

function connectToOwnpad(padId) {
  var pad = getPad(padId);

  document.getElementsByTagName('h1')[0].innerHTML = docTitleSpan(pad) + signupStatus();
  embedPad(pad);
}

// disabled for now... too slow and ugly
function showPreview(text) {
  if(!text || text == '') return;
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

function embedPad(pad) {
  $('#editorPad').pad({
    'padId':encodeURIComponent(pad.id),
    'userName':hyphenify(currentUser() || 'unknown'),
  });
}

function isOwnPad(pad) {
  return (pad.owner == currentUser());
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
  var docs = JSON.parse(localStorage.getItem('documents'));
  docs[pad.id] = pad;
  pushPadId(pad.link, pad.id, function() {
    saveDocuments(docs, function() {
      location.hash = '#!/'+getCurrDocOwner()+'/'+pad.link;
      document.getElementById('docTitle').innerHTML = pad.title;
    });
  });
}
function getCurrDocOwner() {
  return unhyphenify(location.hash.split('/')[1]);
}
function getCurrDocLink() {
  return location.hash.split('/')[2];
}
function getPad(linkOrId) {
  var docs = JSON.parse(localStorage.getItem('documents')||'{}');
  if(docs[linkOrId])
  {
    return docs[linkOrId];
  }
  links2id = JSON.parse(localStorage.getItem('links2id')||'{}');
  if(links2id[linkOrId] && docs[links2id[linkOrId]])
  {
    return docs[links2id[linkOrId]];
  }
  // haven't found the pad in our documents list - use url params
  return {
    owner: getCurrDocOwner(),
    id: linkOrId || getCurrDocOwner()+'$'+getCurrDocLink(),
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

function unhyphenify(userAddress) {
  return userAddress.replace(/-dot-/g, '.').replace(/-at-/g, '@').replace(/-dash-/g, '-');
}

document.getElementsByTagName('body')[0].setAttribute('onload', 'getPadId(connectToOwnpad);');
document.getElementById('loading').style.display='none';
