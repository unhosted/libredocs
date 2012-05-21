<?php 
	session_start();
	include("localization.php");
?><html>
 <head>
  <link rel="stylesheet" type="text/css" href="css/webodf.css"/>
  <script src="js/require.js"></script>
  <script src="extjs/ext-all.js" type="text/javascript" charset="utf-8"></script>
  <script src="/lib/runtime.js" type="text/javascript" charset="utf-8"></script>
  <script src="js/models/document.js" type="text/javascript" charset="utf-8"></script>
  <script src="js/sync.js" type="text/javascript" charset="utf-8"></script>
  <script type="text/javascript" charset="utf-8">
function getPad(cb) {
  fetchDocumentId(getCurrDocOwner(), getCurrDocLink(), function(id) {
    var documents = localGet('documents') || '{}';
    if(id && documents[id]) {
      documents[id].timestamp = new Date().getTime();
      localSet('documents', documents);
      cb(documents[id]);
    } else {
      alert("Could not find document " + getCurrDocLink() + " from " + getCurrDocOwner());
    }
  });
}

function getCurrDocOwner() {
  if(location.hash.length) {
    return location.hash.split('/')[0].substring(1);
  } else {
    window.location.href = 'welcome.php';
  }
}

function getCurrDocLink() {
  if(location.hash.length) {
    return location.hash.substr(location.hash.indexOf('/') + 1);
  } else {
    window.location.href = 'welcome.php';
  }
}

function init() {
  runtime.loadClass("odf.OdfCanvas");
  var odfelement = document.getElementById("odf"),
    odfcanvas = new odf.OdfCanvas(odfelement);
  getPad(function(doc) {
    odfcanvas.load(doc.data);
  });
}
window.setTimeout(init, 0);
  </script>
 </head>
 <body>
  <div id="odf"></div>
 </body>
</html>
