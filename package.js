
Package.describe({
  summary:  "Gagarin, a Meteor testing framework",
  name:     "anti:gagarin",
  version:  "0.1.3",
  git:      "https://github.com/anticoders/gagarin.git",
});

Package.onUse(function (api) {

  api.use('mrt:altimeter@0.0.2', 'server');

  api.addFiles([
    'meteor_hooks.js'
  ], 'server');

  api.export('Gagarin');

});
