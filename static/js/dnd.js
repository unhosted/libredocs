/*
 * FIXME:
 * (firefox-bin:2930): Gtk-CRITICAL **: gtk_drag_get_data: assertion `GTK_IS_WIDGET (widget)' failed
 *
 */
var DnD = {}

DnD.init = function() {
  var dropbox = document.querySelector("#dropbox");
  var trashbox = document.querySelector("#trashbox");

  dropbox.ondragover = function(e) {
    this.className = 'box hover'; 
      if (e.dataTransfer.dropEffect == "move") {
        e.preventDefault();
      }
    return false;
  };
  trashbox.ondragover = function(e) {
      if (e.dataTransfer.dropEffect == "link") {
        e.preventDefault();
      }
  };

  dropbox.ondrop = function(e) {
    e.preventDefault();
    var files = e.dataTransfer.files;
     setTimeout(function() {
      for(var i = 0, f; f=files[i]; i++) {
        var reader = new FileReader();
        reader.onload = (function(file) {
          return function(e) {
            var time = new Date().getTime();
            var owner = currentUser();
            id = owner+'$'+time;
            var doc = {
              id: id,
              title: file.name,
              link: file.name, //TODO: prevent duplicates and so on.
              data: e.target.result,
              type: file.type,
              owner: owner,
              timestamp: time
            };
            saveDocument(doc, function() {
              showList(1);
            });
          }
        })(f);
        reader.readAsDataURL(f);
      }
    },1000);
  };

  trashbox.ondrop = function(e) {
      e.preventDefault();
      Files.removeFromTash(document.querySelector(".dragged"));
  };

  /*
  //FIXME
  document.getElementById("UI").addEventListener("dragenter", function(e) {
      if (e.dataTransfer.dropEffect == "link") {
        trashbox.classList.add("dragging");
      } else {
        dropbox.classList.add("dragging");
      }
  }, false);
  document.getElementById("UI").addEventListener("dragleave", function(e) {
      trashbox.classList.remove("dragging");
      dropbox.classList.remove("dragging");
  }, false);
  */
}

DnD.makePreviewDraggable = function(e) {
  e.dataTransfer.setData("text/plain", "");
  e.dataTransfer.effectAllowed = "link";
  var trashbox = document.querySelector("#trashbox");
  trashbox.classList.add("dragging");
}

DnD.previewIsBeingDragged = function(e) {
  e.target.classList.add("dragged");
}

DnD.previewHasBeenDragged = function() {
  var elts = document.querySelectorAll(".dragged");
  for (var i = 0; i < elts.length; i++) {
    elts[i].classList.remove("dragged");
  }
  var trashbox = document.querySelector("#trashbox");
  trashbox.classList.remove("dragging");
}

window.addEventListener("load", function() { DnD.init() }, true);
