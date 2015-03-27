
module.exports = function parseBuildErrors (output) {
  "use strict";

  var hasErrors = /Errors prevented bundling/.test(output);

  if (!hasErrors) {
    console.log('no build errors');
    return;
  }

  var regExp = /(\w+\.\w+)\:(\d+)\:(\d+)\:\s*(.*)/g;
  var match  = null;
  var err    = null;

  while ( (match = regExp.exec(output)) ) {

    console.log('matched error', match[0]);

    err = new Error('"' + match[4] + '" at ' + match[1] + ':' + match[2] + ':' + match[3]);
  }

  return err;
}
