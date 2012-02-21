function alertFeature(feature) {
  var heading = feature + " support missing."
  var message = "Your browser does not support " + feature +". "
   + "Please use <a href='http://getfirefox.com'>one that does</a>!";
  document.getElementById('error-heading').innerHTML = heading;
  document.getElementById('error-message').innerHTML = message;
  document.getElementById('error').style.display = 'block';
}
(function() {
  if(!$.support.cors) alertFeature('CORS');
  if(!window.localStorage) alertFeature('Local Storage');
})();
