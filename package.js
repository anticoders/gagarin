
Package.describe({
  summary:  "Gagarin, a Meteor testing framework",
  name:     "anti:gagarin",
  version:  "0.3.3",
  git:      "https://github.com/anticoders/gagarin.git",
});

Package.onUse(function (api) {

  api.versionsFrom('METEOR@1.0');
  
  api.use('livedata', 'server');
  api.use('accounts-password', 'server', { weak: true });

  api.addFiles([
    
    'meteor/settings.js',
    'meteor/backdoor.js',

  ], 'server');

  api.export('Gagarin');

});
