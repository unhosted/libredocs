(function($) {
  $(document).ready(function() {
    load();
  });
})(jQuery);


function load() {
  var view = selectView();
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
