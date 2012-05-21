<?php 
	session_start();
	include("localization.php");
?><!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title><?php echo _("Setting your enroll step in localStorage"); ?></title>
    <script>
      var sessionObj = JSON.parse(localStorage.sessionObj);
      sessionObj.step = location.search.substring(1);
      localStorage.sessionObj = JSON.stringify(sessionObj);
    </script>
  </head>
  <body>
    <p><?php echo _("Done. Go <a href='welcome.php'>back to the main page</a>."); ?></p>
  </body>
</html>
