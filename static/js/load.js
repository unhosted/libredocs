(function($) {
  $(document).ready(function() {
    selectView();
  });
})(jQuery);

function selectView() {
  if(location.pathname.length < 2) {
    if(localStorage.documents && localStorage.documents.length > 2){
      loadView('documents');
    }
    else { 
      loadView('welcome');
    }
  }
}

function loadView(view) {
  // we're not dealing with pads yet
  if(view.indexOf('/')!=-1) return;
  if(!$('#'+view).lenght){
    $('#content').load(view+'.html', function(){$('#'+view).show()});
  }
  getScripts(view, function(script) {
    script.load();
  });
}

function getScripts(view, cb) {
  require(['http://libredocs.org/js/'+view+'.js'], cb);
}
