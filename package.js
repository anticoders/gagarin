
Package.describe({
  summary:  "Gagarin, a Meteor testing framework based on mocha",
  name:     "anti:gagarin",
  version:  "0.4.12",
  git:      "https://github.com/anticoders/gagarin.git",
});

Npm.depends({
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
    api.versionsFrom('METEOR@1.2.1');
  }

  api.use([ 'livedata', 'webapp' , 'check'] , 'server');
  api.use('accounts-password', 'server', { weak: true });

  api.add_files([

    'meteor/settings.js',
    'meteor/backdoor.js',

  ], 'server');

  if (api.export) {
    api.export('Gagarin');
  }

});
