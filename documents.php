<?php 
	session_start();
	include("localization.php");
?><div id="documents">
  <div class="btn" id="new-document"><strong><?php echo _("+ New document"); ?></strong></div>
  <input id="upload-document" type="file" multiple></input>
  <!--  <div id="trashbox" class='box'>drop an entry to remove</div> -->
  <ul id="doclist">
  </ul>
  <a class="more" data-page='2'><?php echo _("more &hellip;"); ?></a>
  <div class="sync"><?php echo _("Syncing documents &hellip;"); ?></div>
</div>
