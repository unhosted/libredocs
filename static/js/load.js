(function($) {
  $(document).ready(function() {
    loadView();
    activateLinks();
  });
})(jQuery);

function loadView() {
  // we might be calling this ahead of time.
  if(!$('#content').length) return;
  view = history.state.view;
  // we're not dealing with pads yet
  if(view.indexOf('/')!=-1) return;
  if(!$('#'+view).lenght){
    $('#content').load(view+'.html', function(){$('#'+view).show()});
  }
}

function activateLinks() {
  $('#welcome-menu').click(loadWelcome);
  $('#documents-menu').click(loadDocuments);
}
