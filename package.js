
Package.describe({
  summary:  "Gagarin, a Meteor testing framework",
  name:     "anti:gagarin",
  version:  "0.4.5",
  git:      "https://github.com/anticoders/gagarin.git",
});

Npm.depends({
  'mocha'       : '2.1.0',
  'chai'        : '2.1.0',
  'chai-things' : '0.2.0',
});

Package.onUse(function (api) {

  api.versionsFrom('METEOR@1.0');
  
  api.use('livedata', 'server');
  api.use('accounts-password', 'server', { weak: true });
  api.use(['underscore', 'mongo'], [ 'client', 'server' ]);

  api.addFiles([
    
    'meteor/settings.js',

  ], 'server');

  api.addFiles([

    'meteor/gagarin.js',

  ], [ 'client', 'server']);

  api.addFiles([

    'meteor/backdoor.js',
    'meteor/createUser.js',

  ], 'server');

  api.export('Gagarin');

});
