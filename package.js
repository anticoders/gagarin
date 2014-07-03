
Package.describe({
  summary: "Gagarin bindings for Meteor",
});

Package.on_use(function (api) {

  api.use('altimeter', 'server');

  api.add_files([
    'meteor_hooks.js'
  ], 'server');

  api.export('Gagarin');

});
