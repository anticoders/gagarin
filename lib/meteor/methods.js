
module.exports = {};

module.exports.promise = function (code, args) {
  "use strict";
  var origCaller = new Error("at");

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
    var closure   = operand.closure;
    var context   = this;

    callDDPMethod(origCaller, ddpClient, '/gagarin/promise', [ context, closure(), code.toString(), clean(context, args) ], getSetter(context), closure, cb);

  });
}

module.exports.execute = function (code, args) {
  "use strict";
  var origCaller = new Error("at");

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
    var closure   = operand.closure;
    var context   = this;

    callDDPMethod(origCaller, ddpClient, '/gagarin/execute', [ context, closure(), code.toString(), clean(context, args) ], getSetter(context), closure, cb);

  });
}

module.exports.wait = function (timeout, message, code, args) {
  "use strict";
  var origCaller = new Error("at");

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
    var closure   = operand.closure;
    var context   = this;

    callDDPMethod(origCaller, ddpClient, '/gagarin/wait', [ context, closure(), timeout, message, code.toString(), clean(context, args) ], getSetter(context), closure, cb);

  });
}


function clean(self, args) {
  return args.map(function (value) {
    return typeof value === 'function' ? value.call(self) : value;
  });  
}

function cleanError(caller, feedback){
  //console.error("cleanError", feedback);
  var lineOffset = 11; // taken from the COMPILED debug message in backdoor.js
  var anonRE = /^    at Object\.<anonymous> \(evalmachine.<anonymous>:(\d+):\d+\)$/m;

  var res = anonRE.exec(feedback.stack);
  if(res){
    var loc = parseInt(res[1]) - lineOffset;

    var callerStack = caller.stack.split(/\n +/);
    var lineTestScript = callerStack[2]; // skip msg and call to execute/promise/wait
    var res = lineTestScript.match(/^(at .+):(\d+):\d+$/);
    if(res){
      var computedLineNum = loc + parseInt(res[2]);
      var newLine = res[1] + ":" + computedLineNum + ":1";
      feedback.error = feedback.error + "\n        " + newLine;
      //console.log("CLEAN ERROR", feedback.error);
    }else {
      throw new Error("UNEXPECTED ERROR: couldn't find lineTestScript", lineTestScript);
    }
  }else {
      throw new Error("UNEXPECTED ERROR: couldn't find evalmachine.<anonymous> in", feedback.stack);
  }
  return feedback.error;
}

function callDDPMethod (origCaller, ddpClient, name, args, context, closure, cb) {
  "use strict";

  if (!ddpClient) {
    return cb(new Error('invalid ddpClient'));
  }
  ddpClient.call(name, args, function (err, feedback) {
    //console.log("ddpClient.call", name, err, feedback);
    if (feedback && feedback.closure) {
      closure(feedback.closure);
    }
    if (feedback && feedback.context) {
      context(feedback.context);
    }
    if (err) {
      return cb(err);
    }
    if (!feedback) {
      return cb(new Error('no feedback provided'));
    }
    if (feedback.error) {
      return cb(new Error(cleanError(origCaller, feedback)));
    }
    cb(null, feedback.value);
  });
}

function getSetter(object) {
  "use strict";

  return function setter (updates) {
    Object.keys(updates).forEach(function (key) {
      object[key] = updates[key];
    });
  }
}

function warning (name, signature) {
  "use strict";

  console.warn('\n  meteor.' + name + '(' + signature + ') is now deprecated; please use a list of arguments as the last parameter\n');
}
