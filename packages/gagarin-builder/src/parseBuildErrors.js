
export default function parseBuildErrors (output) {

  let hasErrors = /Errors prevented bundling/.test(output);

  if (!hasErrors) {
    return;
  }

  let regExp = /(\w+\.\w+)\:(\d+)\:(\d+)\:\s*(.*)/g;
  let match  = null;
  let err    = null;

  while ( (match = regExp.exec(output)) ) {
    err = new Error('"' + match[4] + '" at ' + match[1] + ':' + match[2] + ':' + match[3]);
  }

  return err;
};
