
Package.describe({
  summary:  "Gagarin, a Meteor testing framework",
  name:     "anti:gagarin",
  version:  "0.3.0-pre7",
  git:      "https://github.com/anticoders/gagarin.git",
});

Package.onUse(function (api) {

  api.versionsFrom('METEOR@1.0');
  
  api.use('livedata', 'server');

  api.addFiles([
    'backdoor.js'
  ], 'server');

  api.export('Gagarin');

});
