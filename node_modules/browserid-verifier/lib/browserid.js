const
https = require("https"),
jwk = require("jwcrypto/jwk"),
jwt = require("jwcrypto/jwt"),
jwcert = require("jwcrypto/jwcert"),
vep = require("jwcrypto/vep"),
keyfetch = require("./keyfetch");

const ISSUER = 'browserid.org';

// a function to verify an assertion.  arguments:
//   audience: the origin of the calling site (to whom assertions should
//             be targeted, e.g. 'https://mysite.com')
//   assertion: the assertion returned from navigator.id.getVerifiedEmail()
module.exports = function(args, cb) {
  if (typeof cb !== 'function') throw "missing required callback argument";

  if (typeof args !== 'object' ||
      typeof args.audience !== 'string' ||
      typeof args.assertion !== 'string')
  {
    setTimeout(function() { cb('missing required arguments'); }, 0);
    return;
  }
  
  setTimeout(function() {
    try {
      var bundle = vep.unbundleCertsAndAssertion(args.assertion);

      jwcert.JWCert.verifyChain(
        bundle.certificates,
        new Date(), function(issuer, next) {
          // allow other retrievers for testing
          if (issuer !== ISSUER) {
            return cb("certs are only respected from: " + ISSUER);
          }
          keyfetch(issuer, function(err, key) {
            if (err) cb("error fetching key for '" + issuer + "': " + err);
            else next(key);
          });
        }, function(pk, principal) {
          var tok = new jwt.JWT();
          tok.parse(bundle.assertion);

          // audience must match!
          if (tok.audience !== args.audience) {
            return cb("audience mismatch: " +
                      tok.audience + "' != '" + args.audience + "'");
          }

          if (tok.verify(pk)) {
            cb(undefined, {
              email: principal.email,
              audience: tok.audience,
              expires: tok.expires,
              issuer: ISSUER
            });
          } else {
            cb("verification failure");
          }
        }, cb);
    } catch(e) {
      return cb("malformed assertion: " + e.toString());
    }
  }, 0);  
};
