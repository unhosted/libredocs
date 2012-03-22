define(function() {
  function loaded(doc) {

    // TODO: these should probably be defined elsewhere
    var PER_PAGE = 5; 
    var MIME_TYPE_CLASSES = {
      "application/vnd.oasis.opendocument.text": "odf"
    }

    function listDocuments(docs, synced, page) {
      if(!page) emptyDocuments();
      sortedByTimestamp(docs, page, renderDocument);
      displayMore(page, lengthOf(docs));
      setSyncState(synced);
    }

    function emptyDocuments() {
      $('#doclist').empty();
    }

    function renderDocument(doc) {
      var row = documentRow(doc);
      var time = row.find('time');
      row.appendTo('#doclist');
      if (!doc.data) fetchDocument(doc.id, renderDocumentPreview);
      time.text(relativeModifiedDate(doc.timestamp));
      time.attr('style', modifiedDateColor(doc.timestamp));
      time.attr('title',new Date(doc.timestamp).toLocaleString());
      row.show();
    }

    function setSyncState(synced) {
      if(!synced) {
        $('#documents .sync').show();
      } else {
        $('#documents .sync').hide();
      }
    }

    function addClickHandlers() {
      var docs = $('#documents');
      if( docs.attr('data-handlers') === 'active') return;

      docs.on('click', '#new-document', newDocument);
      docs.on('click', '.more', nextPage);
      docs.on('change', '#upload-document', uploadFiles);
      docs.on('click', 'li.odf .preview.btn', previewOdf);

      var list = $('#doclist');
      list.on('click', 'li', activateLi);
      list.on('mouseenter', 'li.active.mine .docTitle', editTitle);
      list.on('blur', 'li.active.mine input.editTitle', saveTitle);

      docs.attr('data-handlers', 'active');
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
      var next = $(e.target).attr('data-page');
      showList(next);
      $(e.target).attr('data-page', next + 1);
    }

    function showList(page) {
      listDocuments(localGet('documents'), isRecent('documents'), page);
      addPopover();
      if(!isRecent('documents')) {
        pullRemote('documents', function(err){
          if(err==404 || !err) listDocuments(localGet('documents'), true, page);
        });
      }
    }

    function documentRow(doc) {
      var row = (doc.owner == currentUser()) ? myDocumentRow(doc) : sharedDocumentRow(doc);
      decorateDocumentRow(row, doc);
      return row;
    }

    function displayMore(page, total) {
      page = page || 1;
      if(total > page*PER_PAGE){
       $('#documents .more').show();
      } else {
       $('#documents .more').hide();
      }
    }



    function myDocumentRow(doc) {
      return $('<li id="'+doc.id+'" class="mine" style="display:none">'
        + ' <strong class="docTitle">'+doc.title+'</strong>'
        + ' <input class="editTitle" type="text" value="'+doc.title+'" style="display:none;" />'
        + ' <span class="preview" id="'+doc.link+'-preview"></span>'
        + ' <time datetime="'+new Date(doc.timestamp).toLocaleString()+'"></time>'
        + ' <div class="buttons" >'
        + previewLink(doc)
        + downloadLink(doc)
        + shareLink(doc)
        + ' </div>'
        + ' <div class="editor" id="'+doc.link+'-edit"></div>'
        + '</li>');
    }

    function sharedDocumentRow(doc) {
      return $('<li id="'+doc.id+'" class="shared" style="display:none">'
        + ' <strong class="docTitle">'+doc.title+'</strong>'
        + ' <span class="owner" id="'+doc.id+'-owner">'+doc.owner+'</span>'
        + ' <time datetime="'+new Date(doc.timestamp).toLocaleString()+'"></time>'
        + ' <div class="buttons" style="display:none;">'
        + shareLink(doc)
        + ' </div>'
        + ' <div class="editor"></div>'
        + '</li>');
    }

    function decorateDocumentRow(li, doc) {
      li.attr('data-type', doc.type);
      if(!doc.type || doc.type == "") {
        li.addClass('pad');
      }
      if(MIME_TYPE_CLASSES[doc.type]) {
        li.addClass(MIME_TYPE_CLASSES[doc.type]);
        // li.css('background', 'url("/images/mime/'+doc.type+'.png") no-repeat left');
        // li.css('padding-left', '6em');
      }
    }

    function previewLink(doc) {
      if(!doc.data || !MIME_TYPE_CLASSES[doc.type]) return "";
      return '<a class="btn preview" title="Preview the content of this document in the browser">show</a>';
    }

    function downloadLink(doc) {
      if(!doc.data) return "";
      return '<a class="btn download" title="Download this document" href="'+doc.data+'">download</a>';
    }

    function shareLink(doc) {
      if(doc.data) return "";
      return ' <a class="btn share" href="#" rel="popover" title="Share this link" data-content="<a href=\''+shareDoc(doc.id)+'\'>'+shareDoc(doc.id)+'</a>"><i class="icon-share-alt"></i> Share</a>'
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
        title: 'Document title',
        link: time,
        owner: owner,
        timestamp: time
      };
      saveDocument(doc);
      docRow = myDocumentRow(doc);
      $('#doclist').append(docRow);
      activateLi(docRow);
    }

    var uploadFiles = function(e) {
      var chooser = e.currentTarget;
      var files = chooser.files;
      if(files.length > 0) {
        setTimeout(function() {
          async.forEach(files, uploadToDocument, function(err) {
            chooser.files = [];
            listDocuments(localGet('documents'), true);
          });
        },100);
      }
    }

    var activateLi = function(eventOrElement) {
      var li = $(eventOrElement.currentTarget || eventOrElement);
      var index = $("#doclist li").index(li);
      if(li.is(".active") && index == 0) return;
      if(index != 0) deactivateLi($('#doclist li').first());
      displayDocument(li);
      raiseLi(li);
    }

    var displayDocument = function(li) {
      var editor = li.find('.editor');
      var id = li.attr('id');
      var doc = localGet('documents')[id];
      if (!doc.data) {
        editor.pad({
          'padId':encodeURIComponent(id),
          'userName':hyphenify(currentUser() || 'unknown'),
        });
      }
      updateTime(id);
      updateHistory(doc);
    }

    var previewOdf = function(eventOrElement) {
      var el = $(eventOrElement.currentTarget || eventOrElement);
      var li = el.is("a") ? el.parent().parent() : el;
      var id = li.attr('id');
      var doc = localGet('documents')[id];
      var data = doc.data;
      runtime.loadClass('odf.OdfCanvas');
      globalreadfunction = runtime.read;
      globalfilesizefunction = runtime.getFileSize;
      runtime.getFileSize = function (path, callback) {
        if (path.indexOf("data:") == -1) {
          globalfilesizefunction.apply(runtime, [path, callback]);
        } else {
          var b = new core.Base64();
          var data = path.substr(path.indexOf(",") + 1);
          data = b.convertBase64ToUTF8Array(data);
          callback(data.length);
        }
      }
      runtime.read = function(path, offset, length, callback) { 
        if (path.indexOf("data:") == -1) {
          globalreadfunction.apply(runtime,
            [path, offset, length, callback]);
        } else {
          var b = new core.Base64();
          var data = path.substr(path.indexOf(",") + 1);
          data = b.convertBase64ToUTF8Array(data);
          callback(null, data.slice(offset, offset + length))
        }
      }
      var odfDiv = $('<div class="odf modal container"></div>');
      var odfcanvas = new odf.OdfCanvas(odfDiv[0]);
      odfcanvas.load(doc.data);
      odfDiv.modal();
    }

    var raiseLi = function(li) {
      li.addClass('active');
      li.prependTo("#doclist");
    }

    var deactivateLi = function(li) {
      li.find('.editor').empty();
      li.find('.editTitle').hide();
      li.find('.docTitle').show();
      li.removeClass('active')
      updateTime(li.attr('id'));
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

      var first = (page-1)*PER_PAGE;
      var last = Math.min(first+PER_PAGE, tuples.length);
      for(var i = first; i < last; i++) {
        cb(tuples[i][1]);
      }
    }

    function getDocAddress(doc) {
      // the more beautiful links so far only work for ourselves
      return 'http://'+location.host+'/#'+doc.owner+'/'+doc.link;
    }

    if(isLoggedIn()) addSignout();
    showList();
    addClickHandlers();
    //TODO: refactor this so we don't get an element to send it to the handler
    if(doc) {
      activateLi(document.getElementById(doc.id));
    }
  }

  return {
    loaded: loaded
  };
});
