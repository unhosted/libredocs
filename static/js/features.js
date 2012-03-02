function alertFeature(feature) {
  var heading = feature + " support missing. "
  var message = "<p>Your browser does not support " + feature +". "
   + "Please use <a href='http://getfirefox.com'>one that does</a>!</p>";
  $('#error-heading').append(heading);
  $('#error-message').append(message);
  $('#error').show();
}
(function($) {
  $(document).ready(function() {
    if(!$.support.cors) alertFeature('CORS');
    if(!window.localStorage) alertFeature('Local Storage');
    if(!history.pushState) alertFeature('push State');
  });
})(jQuery);
