function fetchPadId(cb) {
  require(['http://unhosted.org/remoteStorage-0.4.2.js'], function(remoteStorage) {
    remoteStorage.getStorageInfo(getCurrDocOwner(), function(err, docOwnerStorageInfo) {
      var client = remoteStorage.createClient(docOwnerStorageInfo, 'public');
      client.get('padId:'+getCurrDocLink(), function(err2, data) {
        if(err2) {//the callback should use getPad which will deal with a null
          cb(null);
        } else {
          cb(data);
        }
      });
    });
  });
}
function pushPadId(docName, padId, cb) {
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
  require(['http://unhosted.org/remoteStorage-0.4.2.js'], function(remoteStorage) {
    var client = remoteStorage.createClient(sessionObj.storageInfo, 'public', sessionObj.bearerToken);
    client.put('padId:'+docName, padId, function(err, data) {
      console.log('pushed padId '+padId+' for docName "'+docName+'" - '+err+':"'+data+'"');
      cb();
    });
  });
}
function pushList(cb) {
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
  require(['http://unhosted.org/remoteStorage-0.4.2.js'], function(remoteStorage) {
    var client = remoteStorage.createClient(sessionObj.storageInfo, 'documents', sessionObj.bearerToken);
    client.put('list', localStorage.list, function(err, data) {
      console.log('pushed list - '+err+':"'+data+'"');
      cb();
    });
  });
}
// So far this will connect to the default etherpad server.
// This is just a test for the editor embedding
function connectToOwnpad(padId) {
  var pad = getPad(padId);

  // 
  if(isOwnPad(pad))
  {
    showPreview(pad.text);
    ensureStorageInfo();
  }

  document.getElementsByTagName('h1')[0].innerHTML = docTitleSpan(pad) + signupStatus();
  embedPad(pad);
}
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
function ensureStorageInfo() {
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
  //deal with legacy accounts:
  if(!sessionObj.storageInfo) {
    sessionObj.storageInfo = {
      api: 'CouchDB',
      template: 'http://'+sessionObj.proxy+sessionObj.subdomain+'.iriscouch.com/{category}/',
      auth: 'http://'+sessionObj.subdomain+'.iriscouch.com/cors/auth/modal.html'
    };
    sessionObj.ownPadBackDoor = 'https://'+sessionObj.subdomain+'.iriscouch.com/documents';
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
  return sessionObj.userAddress || 'unknown';
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
  pushPadId(pad.title, pad.id, function() {
    pushList(function() {
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
function getPad(padId) {
  var sessionObj = JSON.parse(localStorage.sessionObj);
  if(getCurrDocOwner() == hyphenify(sessionObj.userAddress)) {
    var list = JSON.parse(localStorage.getItem('list'));
    for(i in list)
    {
      if (list[i].link == getCurrDocLink() && list[i].owner == getCurrDocOwner())
      {
        return list[i];
      }
    }
  }
  // haven't found the pad in our documents list - use url params
  return {
    owner: getCurrDocOwner(),
    id: padId || getCurrDocOwner()+'$'+getCurrDocLink(),
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

document.getElementsByTagName('body')[0].setAttribute('onload', 'fetchPadId(connectToOwnpad);');
document.getElementById('loading').style.display='none';
