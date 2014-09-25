
Package.describe({
  summary:  "Gagarin bindings for Meteor",
  name:     "anti:gagarin",
  version:  "0.1.3",
  git:      "https://github.com/anticoders/gagarin.git",
});

Package.on_use(function (api) {

  api.use('mrt:altimeter@0.0.2', 'server');

  api.add_files([
    'meteor_hooks.js'
  ], 'server');

  api.export('Gagarin');

});
