var sessionStates = {
  0: { page: '/'},
  1: { page: '/loggedIn.html', display:'signing you in', action: signIn},//there is no user address to display at this point yet
   //known user -> go to 20 pulling
   //unknown user -> go through to 2 webfinger
  2: { page: '/loggedIn.html', display:'checking 1/3', action: httpsHostMeta},//might go straight to 4, or to 3. beware of http timeout.
  3: { page: '/loggedIn.html', display:'checking 2/3', action: httpHostMeta},
  4: { page: '/loggedIn.html', display:'checking 3/3', action: lrdd},
  5: { page: '/loggedIn.html', buttons:['allow', 'cancel'] action: noop},//allow will lead to OAuth, which will come back to rcvToken, and take you to 'storing token'
  6: { page: '/loggedIn.html', display:'please sign up', buttons:['agree', 'cancel'], action: noop},
  7: { page: '/loggedIn.html', display:'provisioning', action: provision},
  8: { page: '/loggedIn.html', display:'linking', action: link},
  9: { page: '/loggedIn.html', display:'deploying', action: ping},
  10: { page: '/loggedIn.html', display:'pimping 1/11', action: createAdminUser1},
  11: { page: '/loggedIn.html', display:'pimping 2/11', action: createAdminUser2},
  12: { page: '/loggedIn.html', display:'pimping 3/11', action: config1},
  13: { page: '/loggedIn.html', display:'pimping 4/11', action: createCors},
  14: { page: '/loggedIn.html', display:'pimping 5/11', action: pop1},
  15: { page: '/loggedIn.html', display:'pimping 6/11', action: pop2},
  16: { page: '/loggedIn.html', display:'pimping 7/11', action: pop3},
  17: { page: '/loggedIn.html', display:'pimping 8/11', action: pop4},
  18: { page: '/loggedIn.html', display:'pimping 9/11', action: selfAccess1},
  19: { page: '/loggedIn.html', display:'pimping 10/11', action: selfAccess2},
  20: { page: '/loggedIn.html', display:'pimping 11/11', action: selfAccess3},
  21: { page: '/loggedIn.html', display:'storing token', action: storeToken},
  22: { page: '/loggedIn.html', display:'pulling', action: pull},
  23: { page: '/loggedIn.html', display:'ready', action: noop}
};
