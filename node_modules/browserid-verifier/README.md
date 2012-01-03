**WARNING:** This is alpha quality code, and shouldn't
really be used in production quality systems until this
notice is removed.

A nodejs library for validating BrowserID Assertions.

## Overview

BrowserID is a email based distributed authentication system
for the web, supported by Mozilla.  Using BrowserID you can
allow users to sign into your website with a "verified email address"
rather than a traditional username and password.  For users
sign-in is easier, and for site maintainers it becomes unnecessary
to implement password storage and email verification functions.

## The BrowserID Verification library

This library verifies BrowserID assertions on a node server locally.
The only network requests it makes are to obtain public keys for
identity providers, and these keys are aggressively cached.  This
library is preferred over the mozilla BrowserID service because it
can reduce your external dependencies and decrease network latency
during sign in.  And it's really easy to use.

## Getting Started

First, check out the full example client and server in `example/`.
Just `npm install && example/main.js`, then visit
`http://127.0.0.1:8080` in your browser.

To install:

    npm install browserid-verifier

Then implement client code that calls includes
`https://browserid.org/include.js` and calls
`navigator.id.getVerifiedEmail()` when a user clicks your sign-in
button.  Send the assertion returned from that function up to your
server, and verify it in node:

    var browseridVerify = require('browserid-verifier');

    browseridVerify({
      assertion: theAssertion,
      audience: "http://mysite.com"
    }, function (err, r) {
      // if err is non-falsey, then something went wrong.
      // otherwise, r looks like this:
      //
      //   { email: 'lloyd@mozilla.com',
      //     audience: 'http://127.0.0.1:8080',
      //     expires: Fri, 25 Nov 2011 19:55:36 GMT,
      //     issuer: 'browserid.org' }
      //   

    });

That is all.
