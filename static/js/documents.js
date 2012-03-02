// define(['http://libredocs.org/js/models/documents.js'], function(docs) {

define(function() {
  function loaded(doc) {

    var per_page = 5; // TODO: this should be a constant somewhere

    function listDocuments(docs, synced, page) {
      emptyDocuments();
      sortedByTimestamp(docs, page, renderDocument);
      appendPagination(page, lengthOf(docs));
      setSyncState(synced);
    }

    function emptyDocuments() {
      $('#doclist').empty();
    }

    function renderDocument(doc) {
      var row = documentRow(doc);
      var time = row.find('time');
      row.appendTo('#doclist');
      fetchDocument(doc.id, renderDocumentPreview);
      time.text(relativeModifiedDate(doc.timestamp));
      time.attr('style', modifiedDateColor(doc.timestamp));
      time.attr('title',new Date(doc.timestamp).toLocaleString());
    }

    function appendPagination(page, total) {
      $('#doclist').append(paginationRow(page, total));
    }

    function setSyncState(synced) {
      if(!synced) $('#doclist').append(loadingRow());
    }

    function addClickHandlers() {
      $('#new-document').click(newDocument);
      $('#previous-page').click(previousPage);
      $('#next-page').click(nextPage);
      $('#doclist').on('click', 'li', showDocument);
      $('#doclist').on('mouseenter', 'li.active.mine .docTitle', editTitle);
      $('#doclist').on('blur', 'li.active.mine input.editTitle', saveTitle);
    }

    function addPopover() {
      $('.share').popover({ delay:{show:0, hide:5000} });
      $('.share').popover('hide');
      $('a[rel=popover]').popover().click(function(e) { e.preventDefault(); });
    }

    var previousPage = function(e) {
      var parent_id = $(e.target).parent().attr('id');
      var current = parseInt(parent_id.substr(5));
      showList(current-1);
    }
    
    var nextPage = function(e) {
      var parent_id = $(e.target).parent().attr('id');
      var current = parseInt(parent_id.substr(5));
      showList(current+1);
    }

    function showList(page) {
      listDocuments(localGet('documents'), isRecent('documents'), page);
      addClickHandlers();
      addPopover();
      if(!isRecent('documents')) {
        pullRemote('documents', function(err){
          if(!err) listDocuments(localGet('documents'), true, page);
        });
      }
    }

    function documentRow(doc) {
      return (doc.owner == currentUser()) ? myDocumentRow(doc) : sharedDocumentRow(doc);
    }

    function loadingRow() {
      return $('<li><strong id="loadingdocs">Loading documents &hellip;</strong></li>');
    }

    function paginationRow(page, total) {
      page = page || 1;
      if(total < per_page) return '';
      var li = $('<li id="page-'+page+'">\n</li>');
      if(page != 1) {
        li.append('<span id="previous-page">newer documents</span>\n');
      }
      if(page*per_page < total) {
        li.append('<span id="next-page">older documents</span>\n');
      }
      return li;
    }

    function myDocumentRow(doc) {
      return $('<li id="'+doc.id+'" class="mine">'
        + ' <strong class="docTitle">'+doc.title+'</strong>'
        + ' <input class="editTitle" type="text" value="'+doc.title+'" style="display:none;" />'
        + ' <span class="preview" id="'+doc.link+'-preview"></span>'
        + ' <time datetime="'+new Date(doc.timestamp).toLocaleString()+'"></time>'
        + ' <a class="btn share" href="#" rel="popover" title="Share this link" data-content="<a href=\''+shareDoc(doc.id)+'\'>'+shareDoc(doc.id)+'</a>"><i class="icon-share-alt"></i> Share</a>'
        + ' <div class="editor" id="'+doc.link+'-edit" style="display:none;"></div>'
        + '</li>');
    }

    function sharedDocumentRow(doc) {
      return $('<li id="'+doc.id+'" class="shared">'
        + ' <strong class="docTitle">'+doc.title+'</strong>'
        + ' <span class="owner" id="'+doc.id+'-owner">'+doc.owner+'</span>'
        + ' <time datetime="'+new Date(doc.timestamp).toLocaleString()+'"></time>'
        + ' <a class="btn share" href="#" rel="popover" title="Share this link" data-content="<a href=\''+shareDoc(doc.id)+'\'>'+shareDoc(doc.id)+'</a>"><i class="icon-share-alt"></i> Share</a>'
        + ' <div class="editor" style="display:none;"></div>'
        + '</li>');
    }

    function renderDocumentPreview(doc) {
      if(!doc.atext) return;
      var li = $(document.getElementById(doc.id));
      li.find('.preview').html(truncate(doc.atext.text));
    }

    var newDocument = function(e) {
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
      saveDocument(doc);
      docRow = myDocumentRow(doc);
      $('#doclist').append(docRow);
      showDocument(docRow);
    }

    var showDocument = function(eventOrElement) {
      var li = $(eventOrElement.currentTarget || eventOrElement);
      var editor = li.find('.editor');
      var index = $("#doclist li").index(li);
      if(editor.is(":visible") && index == 0) return;
      if(index != 0) li.hide();
      var old = $('#doclist li').first();
      var id = li.attr('id');
      var doc = localGet('documents')[id];

      editor.pad({
        'padId':encodeURIComponent(id),
        'userName':hyphenify(currentUser() || 'unknown'),
      });

      updateTime(id);
      li.addClass('active')
      li.prependTo("#doclist");
      editor.show();
      li.slideDown(1000);
      if(index > 0){
        old.find('.editor').slideUp().empty();
        old.find('.editTitle').hide();
        old.find('.docTitle').show();
        old.removeClass('active')
        updateTime(old.attr('id'));
      }
      updateHistory(doc);
    }

    function updateTime(id){
      var li = $(document.getElementById(id));
      var time = li.find('time');
      var now = new Date().getTime();
      var documents = localGet('documents')
      documents[id].timestamp = now;
      localSet('documents', documents);
      time.attr('datetime',now.toLocaleString());
      time.text(relativeModifiedDate(now));
      time.attr('style', modifiedDateColor(now));
      time.attr('title', now.toLocaleString());
    }

    function updateHistory(doc){
      var hash = '#/' + doc.owner + '/' + doc.link;
      // don't push again if we came here by popstate or reload
      if(location.hash == hash) return;
      history.pushState(doc, doc.title, '/' + hash);
    }

    function editTitle(e) {
      var title = $(e.currentTarget);
      var input = title.parent().find('input');
      input.show();
      title.hide();
    }

    function saveTitle(e) {
      var input = $(e.currentTarget);
      var li = input.parents('#doclist li').first();
      var title = li.find('.docTitle');
      editingDocTitle = false;
      doc = localGet('documents')[li.attr('id')];
      doc.title = input.val();
      doc.link = linkForDoc(doc);
      saveDocument(doc);
      publishDocument(doc, function() {
        history.replaceState(doc, doc.title, '/#/'+doc.owner+'/'+doc.link);
        title.text(doc.title);
        title.show();
        input.hide();
      });
    }

    function linkForDoc(doc) {
      var link = doc.title.replace(/\s+/g, '-');
      var main = link;
      var postfix = 0;
      var key = doc.owner+'$'+link;
      var index = localGet('index');
      while(index[key] && index[key] != doc.id) {
        postfix++;
        link = main + '-' + postfix;
        key = doc.owner +'$'+link;
      }
      return encodeURIComponent(link);
    }

    function shareDoc(id) {
      var docs = localGet('documents');
      return getDocAddress(docs[id]);
    }


    function sortedByTimestamp(docs, page, cb) {
      page = page || 1;
      var tuples = [];
      for(var id in docs) tuples.push([id, docs[id]]);

      tuples.sort(function(a,b) {
        if(!b[1].timestamp) return -1;
        if(!a[1].timestamp) return 1;
        return b[1].timestamp - a[1].timestamp;
      });

      var first = (page-1)*per_page;
      var last = Math.min(first+per_page, tuples.length);
      for(var i = first; i < last; i++) {
        cb(tuples[i][1]);
      }
    }

  function getDocAddress(doc) {
    // the more beautiful links so far only work for ourselves
    return 'http://+location.host+/#'+doc.owner+'/'+doc.link;
  }

    if(isLoggedIn()) addSignout();
    showList();
    //TODO: refactor this so we don't get an element to send it to the handler
    //as a pseudo event
    if(doc) {
      var e = {currentTarget: document.getElementById(doc.id)};
      showDocument(e);
    }
  }

  return {
    loaded: loaded
  };
});
