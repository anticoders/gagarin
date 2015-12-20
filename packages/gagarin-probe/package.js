
Package.describe({
  summary   : 'Collects data required to run Gagarin tests',
  name      : 'gagarin:probe',
  version   : '0.4.11',
  git       : 'https://github.com/anticoders/gagarin.git',
  // debugOnly packages do not allow build plugins ...
  // debugOnly : true,
});

Package.registerBuildPlugin({
  name: 'probe',
  sources: [ 'plugin.js' ],
});

Package.onUse(function () {
  // nothing special ...
});
