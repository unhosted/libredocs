remoteStorageClient.on('status', function(status) {
  document.getElementsByTagName('h1')[0].innerHTML = 'Libre Docs <small>'+(status.userAddress?' '+status.userAddress:'');
  for(i in status.buttons) {
    document.getElementsByTagName('h1')[0].innerHTML += ' <input type="submit" value="'+status.buttons[i]+'" onclick="remoteStorageClient.'+status.buttons[i]+'();">';
  }
  document.getElementsByTagName('h1')[0].innerHTML += '</small>';
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
    var preview = localStorage.getItem('text'+localStorage.getItem('currDoc'));
    if(preview) {
      docs[localStorage.getItem('currDoc')].preview = preview.substring(0,80);
    } else {
      docs[localStorage.getItem('currDoc')].preview = '(empty)';
    }
    docs[localStorage.getItem('currDoc')].timestamp = new Date().getTime();
    localStorage.setItem('list', JSON.stringify(docs));
    localStorage.removeItem('currDoc');
  }
  str += '<tr onclick="showDoc();"><td><strong>+ New document</strong>'
    +'</td><td><em>'
    +'</em></td></tr>';
  for(i in docs) {
    str += '<tr onclick="showDoc('+i+');"><td><strong>'
      +docs[i].preview
      +'</strong></td><td>'
      +'<em style="'+modifiedDateColor(docs[i].timestamp)+'" '
      +'title="'+new Date(docs[i].timestamp).toLocaleString()+'">'
      +relativeModifiedDate(docs[i].timestamp);
      +'</em></td></tr>';
  }
  document.getElementById('list').innerHTML = str;
}

function showDoc(i) {
  if(!i) {
    i = new Date().getTime();
    var docs = JSON.parse(localStorage.getItem('list'));
    if(!docs) {
      docs = {};
    }
    docs[i] = {};
    docs[i].preview = 'Document title';
    docs[i].timestamp = new Date().getTime();
    localStorage.setItem('list', JSON.stringify(docs));
  }
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
  sessionObj.currDocId = i;
  localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
  window.location='/write/';
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
