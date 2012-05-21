<?php 
	session_start();
	include("localization.php");
?><!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title><?php echo _("Clearing localStorage"); ?></title>
    <script>
      localStorage.clear();
    </script>
  </head>
  <body>
    <p><?php echo _("Cleared your session. Go <a href='welcome.php'>back to the main page</a>."); ?></p>
  </body>
</html>
