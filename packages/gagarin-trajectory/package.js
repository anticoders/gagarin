
Package.describe({
  summary : 'Collects data required to run Gagarin tests',
  name    : 'gagarin:trajectory',
  version : '0.4.11',
  git     : 'https://github.com/anticoders/gagarin.git',
});

Package.registerBuildPlugin({
  name    : 'createGagarinTrajectoryFile',
  sources : [ 'plugin.js' ],
});
