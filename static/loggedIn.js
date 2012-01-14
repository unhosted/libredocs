remoteStorageClient.on('status', function(status) {
  document.getElementsByTagName('h1')[0].innerHTML = 'Libre Docs <small>'+(status.userAddress?' '+status.userAddress:'')+(status.background?' ('+status.background+')':'');
  for(i in status.buttons) {
    document.getElementsByTagName('h1')[0].innerHTML += ' <input type="submit" value="'+status.buttons[i]+'" onclick="remoteStorageClient.'+status.buttons[i]+'();">';
  }
  document.getElementsByTagName('h1')[0].innerHTML += '</small>';
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
  for(i in docs) {
    str += '<tr onclick="showDoc('+i+');"><td><strong>'
      +docs[i].preview
      +'</td><td><em>'
      +docs[i].timestamp
      +'</em></td></tr>';
  }
  str += '<tr onclick="showDoc();"><td><strong>+(new)'
    +'</td><td><em>'
    +'</em></td></tr>';
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
    docs[i].preview = '(new doc)';
    docs[i].timestamp = new Date().getTime();
    localStorage.setItem('list', JSON.stringify(docs));
  }
  var sessionObj = JSON.parse(localStorage.getItem('sessionObj'));
  sessionObj.currDocId = i;
  localStorage.setItem('sessionObj', JSON.stringify(sessionObj));
  window.location='/write/';
}

document.getElementById('body').setAttribute('onload', 'showList();remoteStorageClient.checkForLogin();');
document.getElementById('agree-button').setAttribute('onclick', 'remoteStorageClient.agree();');
