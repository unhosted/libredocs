// a trivial keyfetcher and key cache
const jwk = require("jwcrypto/jwk");

const https = require('https');

const KEY_EXPIRATION = 60 * 1000;

var keys = {
};

module.exports = function(domain, cb)
{
  setTimeout(function() {
    if (typeof domain !== 'string') cb('domain argument missing');
    if (keys[domain]) {
      if ((new Date() - keys[domain].fetched_at) > KEY_EXPIRATION)
        delete keys[domain];
      if (keys[domain]) return cb(undefined, keys[domain].publicKey);
    } 

    https.get({
      host: domain,
      path: '/pk',  // XXX: this will change!
    }, function(res) {
      var key = "";
      res.on('data', function(chunk) {
        key += chunk;
      }).on('end', function () {
        try {
          keys[domain] = {
            publicKey: jwk.PublicKey.deserialize(key),
            fetched_at: new Date()
          };
        } catch(e) {
          return cb("error parsing public key for '"
                    + domain + "': " + e.toString());
        }
        cb(undefined, keys[domain].publicKey);
      });
    }).on('error', function(err) {
      cb(err);
    });
  }, 0);
};
