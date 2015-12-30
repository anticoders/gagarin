// babel compiler & runtime
require("babel-register")({
  "presets": [
    "es2015"
  ],
  "plugins": [
    "syntax-async-functions",
    "transform-regenerator"
  ]
});

// we should be able to get rid of polyfill as soon as
// https://phabricator.babeljs.io/T6676 is fixed
require("babel-polyfill");

// actual tests
require("./createAppBundle.js");
