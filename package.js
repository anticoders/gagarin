
Package.describe({
  summary:  "Gagarin, a Meteor testing framework",
  name:     "anti:gagarin",
  version:  "0.4.0",
  git:      "https://github.com/anticoders/gagarin.git",
});

Package.onUse(function (api) {

  api.versionsFrom('METEOR@1.0');
  
  api.use('livedata', 'server');
  api.use('accounts-password', 'server', { weak: true });

  api.addFiles([
    
    'settings.js',
    'backdoor.js',

  ], 'server');

  api.export('Gagarin');

});
