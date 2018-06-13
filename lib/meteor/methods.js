var logs = require("../logs")
var fs = require("fs")

module.exports = {};

module.exports.promise = function (code, args) {
  var originalError = new Error()
  var deprecated = false;

  if (arguments.length < 2) {
    args = [];
  }

  if (!Array.isArray(args)) {
    deprecated = true;
    args = [ args ];
  }

  return this.__custom__(function (operand, cb) {

    deprecated && warning('promise', 'code, arg');

    var ddpClient = operand.ddpClient;

    if(gagarinOptions.verbose){
      var debugPath = `${gagarinOptions.pathToApp}/.gagarin/tmp/code/promise-${Math.random().toString().split(".")[1]}.js`;
      fs.writeFileSync(debugPath, code.toString());
      logs.server(`Promise: ${debugPath}`)
    }

    callDDPMethod(originalError, ddpClient, '/gagarin/promise', [ code.toString(), args ], cb);

  }).catch(function(err){
    throw err;
  });
}

module.exports.execute = function (code, args) {
  var originalError = new Error()
  var deprecated = false;

  if (arguments.length < 2) {
    args = [];
  }

  if (!Array.isArray(args)) {
    deprecated = true;
    args = [ args ];
  }

  return this.__custom__(function (operand, cb) {

    deprecated && warning('execute', 'code, arg');

    var ddpClient = operand.ddpClient;

    if(gagarinOptions.verbose){
      var debugPath = `${gagarinOptions.pathToApp}/.gagarin/tmp/code/execute-${Math.random().toString().split(".")[1]}.js`;
      fs.writeFileSync(debugPath, code.toString());
      logs.server(`Execute: ${debugPath}`)
    }

    callDDPMethod(originalError, ddpClient, '/gagarin/execute', [ code.toString(), args ], cb);

  });
}

// TODO: library->libraries
module.exports.import = function (library, code, args) {

  var originalError = new Error()
  var deprecated = false;

  if (arguments.length < 3) {
    args = [];
  }

  if (!Array.isArray(args)) {
    deprecated = true;
    args = [ args ];
  }

  return this.__custom__(function (operand, cb) {

    deprecated && warning('import', 'library, code, arg');

    code = `function (...args) { 
      var loadedLibrary = eval(Package.ecmascript.ECMAScript.compileForShell('import someLibrary from "${library}"; someLibrary'));
      var codeToRun = eval(${code});
      return codeToRun.apply(null, [loadedLibrary].concat(args));
    }`

    var ddpClient = operand.ddpClient;

    if(gagarinOptions.verbose){
      var debugPath = `${gagarinOptions.pathToApp}/.gagarin/tmp/code/import-${Math.random().toString().split(".")[1]}.js`;
      fs.writeFileSync(debugPath, code.toString());
      logs.server(`Import: ${debugPath}`)
    }

    callDDPMethod(originalError, ddpClient, '/gagarin/execute', [ code, args ], cb);

  });

}


module.exports.wait = function (timeout, message, code, args) {
  var originalError = new Error()
  var deprecated = false;

  if (arguments.length < 4) {
    args = [];
  }

  if (!Array.isArray(args)) {
    deprecated = true;
    args = [ args ];
  }

  return this.__custom__(function (operand, cb) {

    deprecated && warning('wait', 'timeout, message, code, arg');

    var ddpClient = operand.ddpClient;

    if(gagarinOptions.verbose){
      var debugPath = `${gagarinOptions.pathToApp}/.gagarin/tmp/code/wait-${Math.random().toString().split(".")[1]}.js`;
      fs.writeFileSync(debugPath, code.toString());
      logs.server(`Wait: ${debugPath}`);
    }

    callDDPMethod(originalError, ddpClient, '/gagarin/wait', [ timeout, message, code.toString(), args ], cb);

  });
}

function callDDPMethod (originalError, ddpClient, name, args, cb) {
  if (!ddpClient) {
    return cb(new Error('invalid ddpClient'));
  }
  ddpClient.call(name, args, function (err, feedback) {
    if (err) {
      if(feedback){
        if(feedback.errorName)
          originalError.name = err.errorName;
        if(feedback.errorMessage)
          originalError.message = err.errorMessage;
        if(feedback.errorStack)
          originalError.stack = err.errorStack;
      }
      return cb(originalError, err, feedback);
    }
    if (feedback.error) {
      // feedback.error.errorMessage
      var err = originalError //new Error();
      if(feedback.errorName)
        err.name = feedback.errorName;
      if(feedback.errorMessage)
        err.message = feedback.errorMessage;

      if(feedback.errorStack){
        // var stack = feedback.errorStack.split("\n")[1];
        var matches = feedback.errorStack.match(/funcToRun.*\<anonymous\>\:(\d+)/);
        var offset = parseInt(matches[1]);

        var stack = originalError.stack.split("\n");
        stack.shift();
        stack.shift();
        stack.shift();

        var matches = stack[0].match(/(.+:)(\d+)(:.*)/);
        stack[0] = matches[1] + (parseInt(matches[2]) + offset - 1) + matches[3];

        var source = feedback.errorStack.split("\n")[1]

        stack.pop();
        if(!/funcToRun/.test(source))
          stack.unshift(source);
        stack = stack.join("\n");

        err.message = feedback.errorName + ': ' + feedback.errorMessage;
        err.stack = stack;

      }
      return cb(err, originalError, feedback);
    }
    if (!feedback) {
      return cb(new Error('no feedback provided'));
    }

    cb(null, feedback.value);
  });
}

function getSetter(object) {
  return function setter (updates) {
    Object.keys(updates).forEach(function (key) {
      object[key] = updates[key];
    });
  }
}

function warning (name, signature) {
  console.warn('\n  meteor.' + name + '(' + signature + ') is now deprecated; please use a list of arguments as the last parameter\n');
}
