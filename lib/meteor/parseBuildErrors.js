
module.exports = function parseBuildErrors (output) {
  var hasErrors = /Errors prevented bundling/.test(output);

  if (!hasErrors) {
    return;
  }

  var regExp = /(\w+\.\w+)\:(\d+)\:(\d+)\:\s*(.*)/g;
  var match  = null;
  var err    = null;

  while ( (match = regExp.exec(output)) ) {
    err = new Error('"' + match[4] + '" at ' + match[1] + ':' + match[2] + ':' + match[3]);
  }

  return err;
}
