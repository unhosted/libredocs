function fetchPadId(cb) {
  require(['0.3.0/remoteStorage'], function(remoteStorage) {
    remoteStorage.getStorageInfo(getCurrDocOwner(), function(err, docOwnerStorageInfo) {
      var client = remoteStorage.createClient(docOwnerStorageInfo, 'public');
      client.get('padId:'+getCurrDocLink(), function(err2, data) {
      if(err2) {//by default, docName == padId
        cb(getCurrDocLink());
      } else {
        cb(data);
      }
    });
  });
}
function pushPadId(docName, padId, cb) {
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
  require(['0.3.0/remoteStorage'], function(remoteStorage) {
    var client = remoteStorage.createClient(sessionObj.storageInfo, 'public', sessionObj.bearerToken);
    client.put('padId:'+docName, padId, function(err, data) {
      console.log('pushed padId '+padId+' for docName "'+docName+'" - '+err+':"'+data+'"');
      cb();
    });
  });
}
function pushList(cb) {
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
  require(['0.3.0/remoteStorage'], function(remoteStorage) {
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
  var userName;
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
  var pad = getPad(padId);

  if(pad == null)
  {
    pad = {
      owner: getCurrDocOwner(),
      id: getCurrDocOwner()+'$'+getCurrDocLink(),
      title: getCurrDocLink(),
    };
  }
  else
    // preview
  {
    $('#previewPad').text(pad.text);
    window.onblur = function()
    {
      $('#previewPad').hide();
    };
  }

  // not signed in
  if(sessionObj == null || sessionObj.userAddress == null) 
  {
    document.getElementsByTagName('h1')[0].innerHTML =
      '<span id="docTitle">'+pad.title+'</span>'
      +'<small>';
      +'<input type="submit" value="Sign in" onclick="localStorage.clear();location=\'/\';">'
      +'</small>';
    embedSharedPad(pad.id, "unknown");
    return;
  }
  
  userName = hyphenify(sessionObj.userAddress);
  
  if(pad.owner != userName)
  {
    document.getElementsByTagName('h1')[0].innerHTML = '<span id="docTitle">'+pad.title+'</span>';
    embedSharedPad(pad.id, userName);
  }
  else
  {
    document.getElementsByTagName('h1')[0].innerHTML = '<span id="docTitle" onmouseover="changeDocTitle();">'+pad.title+'</span>';
    embedOwnPad(pad.id);
  }
  document.getElementsByTagName('small')[0].innerHTML =
    (sessionObj.userAddress?' '+sessionObj.userAddress:'')
    +'<a class="btn btn-danger" href="#" onclick="localStorage.clear();location=\'/\';"><i class="icon-remove icon-white"></i> Sign out</a>';
}

function embedOwnPad(padId)
{
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
  $('#editorPad').pad({
    'padId':encodeURIComponent(padId),
    'host':'http://ownpad.nodejitsu.com',
    'storageAddress':encodeURIComponent(sessionObj.ownPadBackDoor),
    'storageTemplate':sessionObj.storageInfo.template,//to be used when there is no BackDoor available
    'bearerToken':encodeURIComponent(sessionObj.bearerToken),
    'storageApi':sessionObj.storageInfo.api,
    'userName':hyphenify(sessionObj.userAddress),
    'showControls':true,
    'showLineNumbers':false,
    'noColors':true
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
  if(getCurrDocOwner() == sessionObj.userAddress) {
    var list = JSON.parse(localStorage.getItem('list'));
    for(i in list)
    {
      if (list[i].link == getCurrDocLink() && list[i].owner == getCurrDocOwner())
      {
        return list[i];
      }
    }
  } else {
    return {
      id: padId
    };
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

function unhyphenify(userAddress) {
  return userAddress.replace(/-dot-/g, '.').replace(/-at-/g, '@').replace(/-dash-/g, '-');
}

document.getElementsByTagName('body')[0].setAttribute('onload', 'fetchPadId(connectToOwnpad);');
document.getElementById('loading').style.display='none';
