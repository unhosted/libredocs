<?php 
	session_start();
	include("localization.php");
?>

<div id="welcome">
  <div id="current-state">
    <div id="intro">
      <h2><?php echo _("Liberate your ideas"); ?></h2>
      <p><?php echo _("<strong>Write online, from anywhere, with your friends.</strong> Easily keep track of your documents instead of being tracked and trapped by the web's monopolies. We neither store your data nor track you. Libre Docs is only the application – your data is stored where you want it to be, using the open <a href='http://www.w3.org/community/unhosted/wiki/RemoteStorage'>remoteStorage protocol</a>."); ?></p>
    </div>
  </div>

  <div id="steps">

    <div class="step remotestorage">
      <img alt="" src="images/remoteStorage.png" />
      <h3>1. <?php echo _("get remoteStorage"); ?></h3>
        <p><?php echo _("Libre Docs does not host your documents. You do. If you haven't yet, get remoteStorage at <a href='https://5apps.com' target='_blank'>5apps</a> or <a href='https://owncube.com' target='_blank'>OwnCube</a>."); ?></p>
    </div>
    <div class="checkmark" style="display:none;">&#10004;</div>
    <div class="step connect active">
      <span id="connect">
        <input id="connect-address" placeholder="user@server" autofocus />
        <input type="submit" id="connect-button" class="btn btn-primary" value="connect" />
      </span>
      <h3>2. <?php echo _("connect"); ?></h3>
      <p style="width:16em"><?php echo _("It's user@server. So user cindy from 5apps.com would type <em>cindy@5apps.com</em> here."); ?></p>
    </div>

    <div class="step write">
      <img alt="" src="images/libredocs.png" />
      <h3>3. <?php echo _("write freely!"); ?></h3>
      <p><?php echo _("Our goal is to create <a target='_blank' href='http://vimeo.com/21387223'>cloud sync</a> for <a target='_blank' href='http://www.libreoffice.org/'>Libre Office</a> <em>(hence the name)</em>.
        But we started by unhosting <a target='_blank' href='http://etherpad.org'>Etherpad</a> for you. Enjoy!"); ?>
      </p>
    </div>
  </div>
</div>