(function($) {
  $(document).ready(function() {
    loadView(selectView());
  });
})(jQuery);


function loadView(view) {
  // we're not dealing with pads yet
  if(view.indexOf('/')!=-1) return;
  if(!$('#'+view).lenght){
    $('#content').load(view+'.html', function(){loaded(view)});
  }
}

function loaded(view) {
  $('#'+view).show();
  getScripts(view, function(script) {
    if(script.load) script.load();
  });
}
