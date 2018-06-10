
Package.describe({
  summary:  "Gagarin, a Meteor testing framework based on mocha",
  name:     "anti:gagarin",
  version:  "1.0.0",
  git:      "https://github.com/anticoders/gagarin.git",
});

Npm.depends({
  'chai'        : '4.1.2',
  'chai-things' : '0.2.0',
});

Package.registerBuildPlugin({
  name: 'gagarin-artifacts',
  sources: ['meteor/plugin.js']
})

Package.onUse(function (api) {

  if (api.versionsFrom) {
    api.versionsFrom('METEOR@1.3');
  }

  api.use('ecmascript');
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
