connectPad = (function() {
  var host = "http://ownpad.unhosted.org:82";
  var api = "/ownapi/1/";

  function urlFor(functionName, params){
    var query = [];
    for (var p in params) {
      query.push(encodeURIComponent(p) + "=" + encodeURIComponent(params[p]));
    }
    return host+api+functionName+"?"+query.join("&");
  }

  function paramsFor(sessionObj){
    return {
      userAddress: sessionObj.userAddress,
      storageInfo: JSON.stringify(sessionObj.storageInfo),
      bearerToken: sessionObj.bearerToken
    }
  }

  function connect(sessionObj, callback){
    var xhr = new XMLHttpRequest();
    xhr.open('GET', urlFor("connect", paramsFor(sessionObj)));
    xhr.onreadystatechange = function() {
      if(xhr.readyState==4) {
        if(xhr.status==201 || xhr.status==200) {
          callback(true);
        } else {
          callback(false);
        }
      }
    };
    xhr.send();
  }

  return {
    urlFor: urlFor,
    paramsFor: paramsFor,
    connect: connect
  };
})();
