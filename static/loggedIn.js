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

function showList(page) {
  page = page || 1;
  per_page = 5; // TODO: this should be a constant somewhere
  var str = '';
  var docs = JSON.parse(localStorage.getItem('list'));
  str += newDocumentRow();
  sortedByTimestamp(docs, page, per_page, function(doc) {
    str += documentRow(doc);
    getDocPreview(doc.id);
  });
  str += paginationRow(page, per_page, lengthOf(docs));
  document.getElementById('doclist').innerHTML = str;
}

function newDocumentRow()
{
  return '<li onclick="showDoc();"><strong>+ New document</strong></li>';
}

function documentRow(doc)
{
  return '<li id="'+doc.id+'">'
    + '<a class="doclink" onclick="showDoc(\''+doc.id+'\');"><strong>'+doc.title+'</strong>'
    + ' <span class="preview" id="'+doc.id+'-preview" onclick="showDoc(\''+doc.id+'\');"></span></a>'
    + '<span class="date" style="'+modifiedDateColor(doc.timestamp)+'" title="'+new Date(doc.timestamp).toLocaleString()+'">'+relativeModifiedDate(doc.timestamp)+'</span>'
    + '<a class="btn share" href="#" rel="popover" title="Share this link" data-content="share(\''+doc.id+'\');"><i class="icon-share-alt"></i> Share</a>'
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
function getDocPreview(id) {
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
  var url = sessionObj.storageAddress + 'pad:' + id;
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.setRequestHeader('Authorization', 'Bearer ' + sessionObj.bearerToken);
  xhr.onreadystatechange = function() {
    if(xhr.readyState == 4) {
      var pad = JSON.parse(xhr.responseText).value;
      if(pad!=null){
        document.getElementById(id+'-preview').innerHTML = truncate(pad.atext.text);
      }
    }
  }
  xhr.send();
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
  localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
  window.location=getDocAddress(docs[i], true);
}
function share(i) {
  var docs = JSON.parse(localStorage.getItem('list'));
  return getDocAddress(docs[i], false);
}

document.getElementById('body').setAttribute('onload', 'showList();remoteStorageClient.checkForLogin();');
document.getElementById('agree-button').setAttribute('onclick', 'remoteStorageClient.agree();');

// Helpers - these should probably go into a general purpose place:

function hyphenify(userAddress) {
  return userAddress.replace(/-/g, '-dash-').replace(/@/g, '-at-').replace(/\./g, '-dot-');
}

function truncate(text, length)
{
  length = length || 70;
  return (text.length > length) ?
    text.substr(0, length-3) + '...' :
    text ;
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

!function ($) {
  $(function(){
    $('.share').popover();
    $("a[rel=popover]").popover().click(function(e) { e.preventDefault(); });
  })
}
