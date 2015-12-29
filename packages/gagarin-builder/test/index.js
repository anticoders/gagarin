// babel compiler & runtime
require("babel-register");

// we should be able to get rid of polyfill as soon as
// https://phabricator.babeljs.io/T6676 is fixed
require("babel-polyfill");

// actual tests
require("./build.js");
