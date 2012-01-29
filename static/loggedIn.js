remoteStorageClient.on('status', function(status) {
  document.getElementsByTagName('small')[0].innerHTML = (status.userAddress?' '+status.userAddress:'');
  for(i in status.buttons) {
    document.getElementsByTagName('small')[0].innerHTML += ' <input type="submit" value="'+status.buttons[i]+'" onclick="remoteStorageClient.'+status.buttons[i]+'();">';
  }
  if(status.step) {
    document.getElementById('easyfreedom-loading').style.display = 'block';
    document.getElementById('easyfreedom-loadingbar').style.width = status.loadingBar+'%';
    document.getElementById('easyfreedom-loadingtext').innerHTML = status.step;
  } else {
    document.getElementById('easyfreedom-loading').style.display = 'none';
  }
});

function showList() {
  var str = '';
  var docs = JSON.parse(localStorage.getItem('list'));
  if(localStorage.getItem('currDoc')) {
    docs[localStorage.getItem('currDoc')].title = 'Title';
    docs[localStorage.getItem('currDoc')].timestamp = new Date().getTime();
    localStorage.setItem('list', JSON.stringify(docs));
    localStorage.removeItem('currDoc');
  }
  str += '<tr onclick="showDoc();"><td><strong>+ New document</strong>'
    +'</td><td></td></tr>';
  sortedByTimestamp(docs, function(doc) {
    str += '<tr id="'+doc.id+'"><td onclick="showDoc(\''+doc.id+'\');"><strong>'
      +doc.title
      +'</strong></td>'
      +'<td style="'+modifiedDateColor(doc.timestamp)+'" '
      +'title="'+new Date(doc.timestamp).toLocaleString()+'">'
      +relativeModifiedDate(doc.timestamp)
      +'<input style="display:none;" type="submit" value="Share" onclick="share(\''+doc.id+'\');">'
      +'</td></tr>';
    getDocPreview(doc.id);
  });
  
  document.getElementById('list').innerHTML = str;
}

function sortedByTimestamp(docs, cb) {
  var tuples = [];
  for(var id in docs) tuples.push([id, docs[id]]);

  tuples.sort(function(a,b) {
    return b[1].timestamp - a[1].timestamp;
  });

  for(var i = 0; i < tuples.length; i++) {
    cb(tuples[i][1]);
  }
}

function hyphenify(userAddress) {
  return userAddress.replace(/-/g, '-dash-').replace(/@/g, '-at-').replace(/\./g, '-dot-');
}
function getDocAddress(doc) {
  return 'http://libredocs.org/write/#!/'+doc.owner+'/'+doc.link;
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
      document.getElementById(id).innerHTML += '<td class="preview">'+truncate(pad.atext.text)+'</td>';
      }
  }
  xhr.send();
}

function truncate(text, length)
{
  if(length==null)
  {
    length=100;
  }
  if(text.length > length)
  {
    return text.substr(0, length-3) + '...';
  }
  else
  {
    return text;
  }
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
      title: time,
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
  window.location=getDocAddress(docs[i]);
}
function share(i) {
  var docs = JSON.parse(localStorage.getItem('list'));
  alert(getDocAddress(docs[i]));
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

document.getElementById('body').setAttribute('onload', 'showList();remoteStorageClient.checkForLogin();');
document.getElementById('agree-button').setAttribute('onclick', 'remoteStorageClient.agree();');
