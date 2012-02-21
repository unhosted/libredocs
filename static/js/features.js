function alertFeature(feature) {
  var heading = feature + " support missing. "
  var message = "<p>Your browser does not support " + feature +". "
   + "Please use <a href='http://getfirefox.com'>one that does</a>!</p>";
  document.getElementById('error-heading').innerHTML += heading;
  document.getElementById('error-message').innerHTML += message;
  document.getElementById('error').style.display = 'block';
}
(function() {
  if(!$.support.cors) alertFeature('CORS');
  if(!window.localStorage) alertFeature('Local Storage');
})();
