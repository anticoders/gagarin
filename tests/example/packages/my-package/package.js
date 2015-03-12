
Package.describe({
  summary: "An example Meteor package",
  name:    "my-package",
  version: "0.0.0",
});

Package.onUse(function (api) {

  api.versionsFrom('METEOR@1.0');
  
  api.addFiles([ 'client.js' ], 'client' );
  api.addFiles([ 'server.js' ], 'server' );

  api.export('MyPackage');

});
