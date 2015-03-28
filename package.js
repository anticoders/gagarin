
Package.describe({
  summary:  "Gagarin, a Meteor testing framework",
  name:     "anti:gagarin",
  version:  "0.4.6",
  git:      "https://github.com/anticoders/gagarin.git",
});

Npm.depends({
  'mocha'       : '2.1.0',
  'chai'        : '2.1.0',
  'chai-things' : '0.2.0',
});

(Package.registerBuildPlugin || Package._transitional_registerBuildPlugin)({
  name: "collectGagarinBuildArtifacts",
  sources: [
    'meteor/plugin.js'
  ],
});

Package.on_use(function (api) {

  if (api.versionsFrom) {
    api.versionsFrom('METEOR@0.9.0');
  }
  
  api.use('livedata', 'server');
  api.use('accounts-password', 'server', { weak: true });
  api.use(['underscore', 'mongo'], [ 'client', 'server' ]);

  api.add_files([
    
    'meteor/settings.js',

  ], 'server');

  api.addFiles([

    'meteor/gagarin.js',

  ], [ 'client', 'server']);

  api.addFiles([

    'meteor/backdoor.js',
    'meteor/createUser.js',

  ], 'server');

  if (api.export) {
    api.export('Gagarin');
  }

});
