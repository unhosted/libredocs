//deal with legacy accounts:
(function() {
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
  if(!sessionObj.storageInfo) {
    sessionObj.storageInfo = {
      api: 'CouchDB',
      template: 'http://'+sessionObj.proxy+sessionObj.subdomain+'.iriscouch.com/{category}/',
      auth: 'http://'+sessionObj.subdomain+'.iriscouch.com/cors/auth/modal.html'
    };
    sessionObj.ownPadBackDoor = 'https://'+sessionObj.subdomain+'.iriscouch.com/documents';
    localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
  }
})();


function fetchList(cb) {
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
  require(['remoteStorage-0.3.2'], function(remoteStorage) {
    var client = remoteStorage.createClient(sessionObj.storageInfo, 'documents', sessionObj.bearerToken);
    client.get('list', function(err, data) {
      console.log('fetched list - '+err+':"'+data+'"');
      if((!err) && data) {
        localStorage.list = data;
      }
      cb();
    });
  });
}
function pushList(cb) {
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
  require(['remoteStorage-0.3.2'], function(remoteStorage) {
    var client = remoteStorage.createClient(sessionObj.storageInfo, 'documents', sessionObj.bearerToken);
    client.put('list', localStorage.list, function(err, data) {
      console.log('pushed list - '+err+':"'+data+'"');
      cb();
    });
  });
}
function checkLogin() {
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
  if(!sessionObj || sessionObj.state != 'ready')
  {
    window.location = '/'
    return;
  }
  document.getElementsByTagName('small')[0].innerHTML = (sessionObj.userAddress?' '+sessionObj.userAddress:'');
  document.getElementsByTagName('small')[0].innerHTML += '<a class="btn btn-danger" href="#" onclick="signOut();"><i class="icon-remove icon-white"></i> Sign out</a>';
}

function showList(page) {
  page = page || 1;
  per_page = 5; // TODO: this should be a constant somewhere
  var str = '';
  var docs = JSON.parse(localStorage.getItem('list'));
  str += newDocumentRow();
  sortedByTimestamp(docs, page, per_page, function(doc) {
    str += documentRow(doc);
    updateDocPreview(doc.id);
  });
  str += paginationRow(page, per_page, lengthOf(docs));
  document.getElementById('doclist').innerHTML = str;
  $('.progress').hide();
  $('.share').popover({ delay:{show:0, hide:5000} });
  $('.share').popover('hide');
  $('a[rel=popover]').popover().click(function(e) { e.preventDefault(); });
}

function newDocumentRow()
{
  return '<li onclick="showDoc();"><strong>+ New document</strong></li>';
}

function documentRow(doc)
{
  return '<li id="'+doc.id+'">'
    + '<a class="doclink" onclick="showDoc(\''+doc.id+'\');"><strong>'+doc.title+'</strong>'
    + ' <span class="preview" id="'+doc.id+'-preview" onclick="showDoc(\''+doc.id+'\');">'
    + truncate(doc.text)+'</span></a>'
    + '<span class="date" style="'+modifiedDateColor(doc.timestamp)+'" title="'+new Date(doc.timestamp).toLocaleString()+'">'+relativeModifiedDate(doc.timestamp)+'</span>'
    + '<a class="btn share" href="#" rel="popover" title="Share this link" data-content="<a href=\''+share(doc.id)+'\'>'+share(doc.id)+'</a>"><i class="icon-share-alt"></i> Share</a>'
    + '</li>';
}

function paginationRow(page, per_page, total)
{
  if(total < per_page) return '';
  var str = '<tr><td colspan=2>\n';
  if(page != 1)
  {
    str += '<span onclick="showList('+(page-1)+');" style="float:left;">newer documents</span>\n';
  }
  if(page*per_page < total)
  {
    str += '<span onclick="showList('+(page+1)+');" style="float:right;">older documents</span>\n';
  }
  str += '</td></tr>\n';
  return str;
}

function sortedByTimestamp(docs, page, count, cb) {
  var tuples = [];
  for(var id in docs) tuples.push([id, docs[id]]);

  tuples.sort(function(a,b) {
    return b[1].timestamp - a[1].timestamp;
  });

  var first = (page-1)*count
  var last = Math.min(first+count, tuples.length);
  for(var i = first; i < last; i++) {
    cb(tuples[i][1]);
  }
}

function getDocAddress(doc, beautiful) {
  // the more beautiful links so far only work for ourselves
  if(beautiful)
  {
    return 'http://libredocs.org/write/#!/'+doc.owner+'/'+doc.link;
  }
  else
  {
    return 'http://libredocs.org/write/#!/'+doc.id.replace('$','/');
  }
}

// TODO: so far this only works for our own docs
function updateDocPreview(id) {
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
  require(['remoteStorage-0.3.2'], function(remoteStorage) {
    var client = remoteStorage.createClient(sessionObj.storageInfo, 'documents', sessionObj.bearerToken);
    client.get('pad:'+id, function(err, data) {
      if(err) {
        console.log('remoteStorage error '+err+': "'+data+'"');
      } else {
        var pad = JSON.parse(data).value;
        if(pad!=null){
          var docs = JSON.parse(localStorage.getItem('list'));
          docs[id].text = pad.atext.text;
          document.getElementById(id+'-preview').innerHTML = truncate(pad.atext.text);
          localStorage.setItem('list', JSON.stringify(docs));
          pushList();
        }
      }
    });
  });
}

function showDoc(i) {
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
  if(!i) {
    var time = new Date().getTime();
    var owner = hyphenify(sessionObj.userAddress);
    i = owner+'$'+time;
    var docs = JSON.parse(localStorage.getItem('list'));
    if(!docs) {
      docs = {};
    }
    docs[i] = {
      id: i,
      title: 'New document',
      link: time,
      owner: owner,
      timestamp: time
    };
    localStorage.setItem('list', JSON.stringify(docs));
  }
  else
  {
    var docs = JSON.parse(localStorage.getItem('list'));
    docs[i].timestamp = new Date().getTime();
    localStorage.setItem('list', JSON.stringify(docs));
  }
  pushList(function() {
    window.location=getDocAddress(docs[i], true);
  });
}
function share(i) {
  var docs = JSON.parse(localStorage.getItem('list'));
  return getDocAddress(docs[i], false);
}

document.getElementById('list').setAttribute('onload', 'checkLogin();fetchList(showList);') 

// Helpers - these should probably go into a general purpose place:

function hyphenify(userAddress) {
  return userAddress.replace(/-/g, '-dash-').replace(/@/g, '-at-').replace(/\./g, '-dot-');
}

function truncate(text, length)
{
  text = text || '';
  length = length || 70;
  return (text.length > length) ?
    text.substr(0, length-3) + '...' :
    text;
}

function relativeModifiedDate(timestamp) {
  var timediff = Math.round((new Date().getTime()-timestamp) / 1000);
  var diffminutes = Math.round(timediff/60);
  var diffhours = Math.round(diffminutes/60);
  var diffdays = Math.round(diffhours/24);
  var diffmonths = Math.round(diffdays/31);
  var diffyears = Math.round(diffdays/365);
  if(timediff < 60) { return 'seconds ago'; }
  else if(timediff < 120) { return 'a minute ago'; }
  else if(timediff < 3600) { return diffminutes+' minutes ago'; }
  //else if($timediff < 7200) { return '1 hour ago'; }
  //else if($timediff < 86400) { return $diffhours.' hours ago'; }
  else if(timediff < 86400) { return 'today'; }
  else if(timediff < 172800) { return 'yesterday'; }
  else if(timediff < 2678400) { return diffdays+' days ago'; }
  else if(timediff < 5184000) { return 'last month'; }
  //else if($timediff < 31556926) { return $diffmonths.' months ago'; }
  else if(timediff < 31556926) { return 'months ago'; }
  else if(timediff < 63113852) { return 'last year'; }
  else { return diffyears+' years ago'; }
}

function modifiedDateColor(timestamp) {
  var lastModifiedTime = Math.round(timestamp / 1000);
  var modifiedColor = Math.round((Math.round((new Date()).getTime() / 1000)-lastModifiedTime)/60/60/24*5);
  if(modifiedColor>210) modifiedColor = 210;
  return 'color:rgb('+modifiedColor+','+modifiedColor+','+modifiedColor+')';
}

function lengthOf(obj)
{
  var length = 0, key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) length++;
  }
  return length;
}

function signOut()
{
  // once we have sync we can just clear this one.
  localStorage.removeItem("sessionObj");
  window.location = '/';
}
