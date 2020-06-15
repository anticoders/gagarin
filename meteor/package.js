Package.describe({
  summary:  "Gagarin, a Meteor testing framework based on mocha",
  name:     "anti:gagarin",
  version:  "1.0.0",
  git:      "https://github.com/anticoders/gagarin.git"
});


Npm.depends({
  'chai'        : '4.1.2',
  'chai-things' : '0.2.0',
  'chai-spies'  : '1.0.0'
});



Package.registerBuildPlugin({
  name: 'gagarin-artifacts',
  sources: ['plugin.js']
})


Package.onUse(function (api) {


  if (api.versionsFrom) {
    api.versionsFrom('METEOR@1.3');
  }

  api.use('ecmascript');
  api.use('dynamic-import');
  api.use([ 'livedata', 'webapp' , 'check'] , 'server');
  api.use('accounts-password', 'server', { weak: true });
  api.use('okgrow:migrations', { weak: true });

  api.add_files([

    'settings.js',
    'backdoor.js',

  ], 'server');

  api.add_files([
    'chai.js'
  ], 'client');


  if (api.export) {
    api.export('Gagarin');
    api.export('chai');
  }

});
