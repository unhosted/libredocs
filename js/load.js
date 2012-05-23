(function($) {
  $(document).ready(function() {
    load();
  });
})(jQuery);


function load() {
  var view = selectView();
  htmlLoaded(view, function(){loaded(view)});
}

function htmlLoaded(view, cb){
  if(!$('#'+view).length){
    $('#content').load(view+'.html', cb);
  } else {
    cb();
  }
}

// TODO: use async parallel
function loaded(view, doc) {
  $('#'+view).show();
  getScripts(view, function(script) {
    if(!script.loaded) return;
    getDocFromHash(function(doc) {
      script.loaded(doc);
    });
  });
}