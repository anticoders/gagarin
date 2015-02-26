var cleanError = require('../tools').cleanError;
var either     = require('../tools').either;
var fs         = require('fs');

module.exports = {};

module.exports.execute = function (code, args) {
  "use strict";

  var self =  this;

  if (args === undefined) {
    args = [];
  }

  if (typeof code !== 'string' && typeof code !== 'function') {
    throw new Error('`code` has to be either string or a function')
  }

  if (!Array.isArray(args)) {
    throw new Error('`args` has to be an array');
  }

  return self.__custom__(function (operand, done) {

    if (this.lastError) {

      if (this.retryCount <= 1 ) {

        // try chai, if fails , load it
        operand.browser.execute(function(){
          chai.expect();
        }, either(loadChai).or(doAction));


      } else {
        done(this.lastError);
      }
    } else {
      doAction();
    }
    
    function loadChai(){
        
      var chai = fs.readFileSync('./node_modules/chai/chai.js','utf8');
      var chaiThings = fs.readFileSync('./node_modules/chai-things/lib/chai-things.js','utf8');

      operand.browser.execute( function(chaiSrc,chaiThingsSrc){

        var chaiScript = document.createElement('script');
        chaiScript.text = chaiSrc;
        window.document.head.appendChild(chaiScript);
        window['expect'] = chai.expect;

        var chaiThingsScript = document.createElement('script');
        chaiThingsScript.text = chaiThingsSrc;
        window.document.head.appendChild(chaiThingsScript);
        chai.should();  // initialize chai things

      }, [chai,chaiThings] , either(done).or(doAction));

    }

    function doAction() {
      var closure  = operand.closure ? operand.closure() : {};

      operand.browser.execute("return (" + wrapSourceCode(codeToString(code), args, closure) + ").apply(null, arguments)",
          values(closure), feedbackProcessor(operand.closure.bind(operand), done));
    }

    return true; // retry on first attempt
  });
};

module.exports.timeout = function (ms) {
  this._timeout = ms;
  return this;
};

module.exports.promise = function (code, args) {
  "use strict";

  var self = this;

  if (args === undefined) {
    args = [];
  }

  if (typeof code !== 'string' && typeof code !== 'function') {
    throw new Error('`code` has to be either string or a function')
  }

  if (!Array.isArray(args)) {
    throw new Error('`args` has to be an array');
  }

  // we could set this 5000 globally, right?

  return self.__custom__(function (operand, done) {
    
    operand.browser.setAsyncScriptTimeout(self._timeout || 5000, done);

  }).__custom__(function (operand, done) {

    var closure = operand.closure ? operand.closure() : {};
    var chunks  = [];

    var keys = Object.keys(closure).map(function (key) {
      return stringify(key) + ": " + key;
    }).join(',');

    // stringify arguments
    args = args.map(stringify);

    args.unshift("(function (cb) {\n    return function ($) {\n      setTimeout( function () { cb({ error : ($ && typeof $ === 'object') ? $.message : $.toString()," +
      " closure: {" + keys + "}}); });\n    };\n  })(arguments[arguments.length-1])");

    args.unshift("(function (cb) {\n    return function ($) {\n      setTimeout( function () { cb({ value : $, closure: {" +
      keys + "}}); });\n    };\n  })(arguments[arguments.length-1])");

    chunks.push(
      "function (" + Object.keys(closure).join(', ') + ") {",
      "  'use strict';",
      "  var either = function (first) {",
      "    return {",
      "      or: function (second) {",
      "        return function (arg1, arg2) {",
      "          return arg1 ? first(arg1) : second(arg2);",
      "        };",
      "      }",
      "    };",
      "  };",
      "  try {",
      "    (" + codeToString(code) + ")(",
      "    " + args.join(', ') + ");",
      "  } catch ($) {",
      "    arguments[arguments.length-1]({",
      "      error   : $.message,",
      "      closure : { " + keys + " }",
      "    });",
      "  }",
      "}"
    );

    //console.log(chunks.join('\n'))

    code = chunks.join('\n');

    // TODO: how come "args" instead of values(closure) was passing as well?
    operand.browser.executeAsync("(" + code + ").apply(null, arguments)",
      values(closure), feedbackProcessor(operand.closure.bind(operand), done));
  });

};

module.exports.wait = function (timeout, message, code, args) {
  "use strict";

  if (args === undefined) {
    args = [];
  }

  if (typeof timeout !== 'number') {
    throw new Error('`timeout` has to be a number');
  }

  if (typeof message !== 'string') {
    throw new Error('`message` has to be a string');
  }

  if (typeof code !== 'string' && typeof code !== 'function') {
    throw new Error('`code` has to be either string or a function')
  }

  if (!Array.isArray(args)) {
    throw new Error('`args` has to be an array');
  }

  var self = this;

  return self.__custom__(function (operand, done) {
    
    operand.browser.setAsyncScriptTimeout(2 * timeout, done);

  }).__custom__(function (operand, done) {

    var closure = operand.closure ? operand.closure() : {};
    var chunks  = [];

    var keys = Object.keys(closure).map(function (key) {
      return stringify(key) + ": " + key;
    }).join(',');

    args = args.map(stringify);

    chunks.push("function (" + Object.keys(closure).join(', ') + ") {");

    chunks.push(
      '  "use strict";',
      '  var cb = arguments[arguments.length - 1];',
      '  var handle1 = null;',
      '  var handle2 = window.setTimeout(function () {',
      '    window.clearTimeout(handle1);',
      '    cb({ closure: {' + keys + '}, error: ' + JSON.stringify('I have been waiting for ' + timeout + ' ms ' + message + ', but it did not happen.') + ' });',
      '  }, ' + JSON.stringify(timeout) + ');',
      '  (function test() {',
      '    var value;',
      '    try {',
      '      value = (' + codeToString(code) + ')(' + args.join(', ') + ');',
      '      if (value) {',
      '        window.clearTimeout(handle2);',
      '        cb({ value: value, closure: {' + keys + '} });',
      '      } else {',
      '        handle1 = window.setTimeout(test, 50);', // repeat after 1/20 sec.
      '      }',
      '    } catch (err) {',
      '      window.clearTimeout(handle2);',
      '      cb({ error: err.message, closure: {' + keys + '} });',
      '    }',
      '  }());'
    );

    chunks.push('}');

    code = chunks.join('\n');

    operand.browser.executeAsync("(" + code + ").apply(null, arguments)", values(closure),
      feedbackProcessor(operand.closure.bind(operand), done));
  });

};

function values(closure) {
  "use strict";

  var values = Object.keys(closure).map(function (key) {
    return closure[key];
  });
  if (arguments.length > 1) {
    values.push.apply(values, Array.prototype.slice.call(arguments, 1));
  }
  return values;
}

function stringify(value) {
  "use strict";

  if (typeof value === 'function') {
    return value.toString();
  }
  return value !== undefined ? JSON.stringify(value) : "undefined";
}

function codeToString(code) {
  "use strict";

  var test;

  if (typeof code === 'string' && !/^function\s+\(/.test(code)) {
    return 'function () {\n' + code + '\n}';
  }
  if (typeof code === 'function') {
    return code.toString();
  }

  eval("test = " + code); // XXX it may throw on syntax error

  return code;
}

function feedbackProcessor(closure, cb) {
  "use strict";

  return function (err, feedback) {
    if (err) {
      return cb(err);
    }
    if (feedback.closure) {
      closure(feedback.closure);
    }
    if (feedback.error) {
      return cb(cleanError(feedback.error));
    }
    cb(null, feedback.value);
  }
}

function wrapSourceCode(code, args, closure) {
  "use strict";

  var chunks = [];

  chunks.push("function (" + Object.keys(closure).join(', ') + ") {");

  //addSyncChunks(chunks, closure, accessor);

  chunks.push(
    "  'use strict';",
//    "  var expect;",
    "  try {",
//    "    if (!window.chai) { throw new Error('chai not found'); }",
//    "    expect = window.chai.expect;",
    "    return (function ($) {",
    "      return {",
    "        closure: {"
  );

  Object.keys(closure).forEach(function (key) {
    chunks.push("          " + stringify(key) + ": " + key + ",");
  });

  chunks.push(
    "        },",
    "        value: $,",
    "      };",
    "    })( (" + code + ")(" + args.map(stringify).join(',') + ") );",
    "  } catch (err) {",
    "    return {",
    "      closure: {"
  );

  Object.keys(closure).forEach(function (key) {
    chunks.push("        " + stringify(key) + ": " + key + ",");
  });

  chunks.push(
    "      },",
    "      error: err.message",
    "    };",
    "  }",
    "}"
  );

  return chunks.join('\n');
}
