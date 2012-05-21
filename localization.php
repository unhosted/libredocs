<?php 
	setlocale(LC_ALL, $_SESSION['lang']); 
	putenv('LANG='.$_SESSION['lang']); 
	putenv('LANGUAGE='.$_SESSION['lang']);
	
	$domain="default"; 
	
	// Spécifie la localisation des tables de traduction
	bindtextdomain("$domain", "./locale"); 
	// Choisit le domaine
	$dir=textdomain("$domain");
?>