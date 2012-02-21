function listDocuments(docs, synced, page) {
  page = page || 1;
  per_page = 5; // TODO: this should be a constant somewhere
  var str = '';
  str += newDocumentRow();
  sortedByTimestamp(docs, page, per_page, function(doc) {
    str += documentRow(doc);
  });
  if(!synced) str += loadingRow();
  str += paginationRow(page, per_page, lengthOf(docs));
  document.getElementById('doclist').innerHTML = str;
  sortedByTimestamp(docs, page, per_page, function(doc) {
    fetchDocument(doc.id, renderDocumentPreview);
  });
  $('.share').popover({ delay:{show:0, hide:5000} });
  $('.share').popover('hide');
  $('a[rel=popover]').popover().click(function(e) { e.preventDefault(); });
}

function showList(page) {
  fetchDocuments( function(docs, synced) {
    listDocuments(docs, synced, page);
  });
}

function newDocumentRow() {
  return '<li onclick="newDoc();"><strong>+ New document</strong></li>';
}

function documentRow(doc) {
  return (doc.owner == currentUser()) ? myDocumentRow(doc) : sharedDocumentRow(doc);
}

function loadingRow() {
  return '<li><strong id="loadingdocs">Loading documents &hellip;</strong></li>'
}

function paginationRow(page, per_page, total) {
  if(total < per_page) return '';
  var str = '<li>\n';
  if(page != 1) {
    str += '<span onclick="showList('+(page-1)+');" style="float:left;">newer documents</span>\n';
  }
  if(page*per_page < total) {
    str += '<span onclick="showList('+(page+1)+');" style="float:right;">older documents</span>\n';
  }
  str += '<li>\n';
  return str;
}

function myDocumentRow(doc) {
  return '<li id="'+doc.id+'" class="mine">'
    + '<a class="doclink" onclick="showDoc(\''+doc.id+'\');"><strong>'+doc.title+'</strong>'
    + ' <span class="preview" id="'+doc.id+'-preview"></span></a>'
    + '<span class="date" style="'+modifiedDateColor(doc.timestamp)+'" title="'+new Date(doc.timestamp).toLocaleString()+'">'+relativeModifiedDate(doc.timestamp)+'</span>'
    + '<a class="btn share" href="#" rel="popover" title="Share this link" data-content="<a href=\''+shareDoc(doc.id)+'\'>'+shareDoc(doc.id)+'</a>">Share</a>'
    + '</li>';
}

function sharedDocumentRow(doc) {
  return '<li id="'+doc.id+'" class="shared">'
    + '<a class="doclink" onclick="showDoc(\''+doc.id+'\');"><strong>'+doc.title+'</strong>'
    + ' <span class="owner" id="'+doc.id+'-owner">'+doc.owner+'</span></a>'
    + '<span class="date" style="'+modifiedDateColor(doc.timestamp)+'" title="'+new Date(doc.timestamp).toLocaleString()+'">'+relativeModifiedDate(doc.timestamp)+'</span>'
    + '<a class="btn share shared" href="#" rel="popover" title="Share this link" data-content="<a href=\''+shareDoc(doc.id)+'\'>'+shareDoc(doc.id)+'</a>">Share</a>'
    + '</li>';
}

function renderDocumentPreview(doc) {
  if(!doc.atext) return;
  document.getElementById(doc.id+'-preview').innerHTML = truncate(doc.atext.text);
}

function newDoc() {
  var time = new Date().getTime();
  var owner = currentUser();
  id = owner+'$'+time;
  var doc = {
    id: id,
    title: 'New document',
    link: time,
    owner: owner,
    timestamp: time
  };
  saveDocument(doc, function() {
    window.location.href = getDocAddress(doc);
  });
}

function showDoc(id) {
  var docs = localGet('documents');
  window.location.href = getDocAddress(docs[id]);
}

function shareDoc(id) {
  var docs = localGet('documents');
  return getDocAddress(docs[id]);
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

function getDocAddress(doc) {
  // the more beautiful links so far only work for ourselves
  return 'http://libredocs.org/#'+doc.owner+'/'+doc.link;
}

document.getElementById('list').setAttribute('onload', 'checkLogin();fetchDocuments(listDocuments);') 
