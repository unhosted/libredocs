function hyphenify(userAddress) {
  return userAddress.replace(/-/g, '-dash-').replace(/@/g, '-at-').replace(/\./g, '-dot-');
}

function truncate(text, length) {
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

function lengthOf(obj) {
  var length = 0, key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) length++;
  }
  return length;
}

function alertMessage(heading, message, debug) {
  var pretty;
  document.getElementById('error-heading').innerHTML = heading;
  document.getElementById('error-message').innerHTML = message;
  if(debug){
    if (typeof debug === 'object'){
      pretty = JSON.stringify(debug,null, 2)
    }
    document.getElementById('error-debug').innerHTML = pretty || debug;
  }
  document.getElementById('error').style.display = 'block';
}

function showDebug() {
  document.getElementById('error-debug').style.display = 'block';
}

function showChat() {
  $('#error-chat').html('<iframe src="http://webchat.freenode.net?nick=helpme-LibreDocs&channels=unhosted&uio=Mz1mYWxzZSY5PXRydWUmMTA9dHJ1ZQ09" width="647" height="400"></iframe>');
  $('#error-chat').show();
}
