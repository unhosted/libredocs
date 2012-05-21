<?php
	if ((isset($_GET['lang']) && !empty($_GET['lang'])) || (isset($_COOKIE['lang']) && !empty($_COOKIE['lang']))) {
	    $_SESSION['lang'] = urldecode($_GET['lang']);
	    setcookie("lang", $_SESSION['lang'], time() + (3600 * 24 * 365));
	}
	// Langue par défaut
	if (empty($_SESSION['lang'])) $_SESSION['lang'] = 'en_US.utf8';
?>