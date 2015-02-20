(function () {

if (typeof sourceMapSupport !== 'undefined') {
  sourceMapSupport.install();
}

var Gagarin = {};

if (typeof Package === 'undefined') Package = {};

if (!Package['anti:gagarin']) {
  Package['anti:gagarin'] = {
    Gagarin: Gagarin,
  };
} else {
  Gagarin = Package['anti:gagarin'].Gagarin;
}

var _Mocha = null;

if (typeof Npm !== 'undefined') {
  _Mocha = Npm.require('mocha');
} else {
  _Mocha = Mocha;
}

Gagarin.mocha = new _Mocha({ reporter: Laika });
Gagarin.mocha.suite.emit('pre-require', this);

var feedback = null;

Gagarin.mocha.setFeedbackFunction = function (func) {
  feedback = func;
}

var Base = _Mocha.reporters.Base;

// TODO: implement our own coloring
var color = Base.color;

function Laika(runner) {
  Base.call(this, runner);

  var self  = this;
  var stats = this.stats;
  var total = runner.total;

  runner.on('start', function() {
    feedback && feedback('start', { total: total });
  });

  runner.on('pass', function(test){
    feedback && feedback('pass', clean(test));
  });

  runner.on('fail', function(test, err){
    feedback && feedback('fail', clean(test));
  });

  runner.on('end', function(){
    if (self.stats.failures) {
      self.stats.message = listAllFailures(self.failures);
    }
    feedback && feedback('end', self.stats);
  });
}

function clean(test) {
  return {
    speed: test.speed,
    title: test.title,
    fullTitle: test.fullTitle(),
    duration: test.duration,
  }
}

// the following methods are addopted from mocha

/**
 * Outut the given `failures` as a list.
 *
 * @param {Array} failures
 * @api public
 */

function listAllFailures (failures, options) {
  options = options || {};
  //-------------------------------------
  return failures.map(function(test, i) {

    // format
    var fmt = color('error title', '  {0}) {1}:\n')
      + color('error message', '     {2}')
      + color('error stack', '\n{3}\n');

    // msg
    var err = test.err
      , message = err.message || ''
      , stack = err.stack || message
      , index = stack.indexOf(message) + message.length
      , msg = stack.slice(0, index)
      , actual = err.actual
      , expected = err.expected
      , escape = true;

    // uncaught
    if (err.uncaught) {
      msg = 'Uncaught ' + msg;
    }

    // explicitly show diff
    if (err.showDiff && sameType(actual, expected)) {
      escape = false;
      err.actual = actual = utils.stringify(actual);
      err.expected = expected = utils.stringify(expected);
    }

    // actual / expected diff
    if (err.showDiff && 'string' == typeof actual && 'string' == typeof expected) {
      fmt = color('error title', '  {0}) {1}:\n{2}') + color('error stack', '\n{3}\n');
      var match = message.match(/^([^:]+): expected/);
      msg = '\n      ' + color('error message', match ? match[1] : msg);

      if (options.inlineDiffs) {
        msg += inlineDiff(err, escape);
      } else {
        msg += unifiedDiff(err, escape);
      }
    }

    // indent stack trace without msg
    stack = stack.slice(index ? index + 1 : index).replace(/^/gm, '  ');

    var values = [ (i + 1), test.fullTitle(), msg, stack ];

    return fmt.replace(/\{(\d+)\}/g, function (group, number) {
      return values[number];
    });
  }).join('\n\n');
};

/**
 * Stringify `obj`.
 *
 * @param {Object} obj
 * @return {String}
 * @api private
 */

function stringify (obj) {
  if (obj instanceof RegExp) return obj.toString();
  return JSON.stringify(canonicalize(obj), null, 2).replace(/,(\n|$)/g, '$1');
};

/**
 * Return a new object that has the keys in sorted order.
 * @param {Object} obj
 * @param {Array} [stack]
 * @return {Object}
 * @api private
 */

function canonicalize (obj, stack) {
  stack = stack || [];

  if (stack.indexOf(obj) !== -1) return '[Circular]';

  var canonicalizedObj;

  if ({}.toString.call(obj) === '[object Array]') {
    stack.push(obj);
    canonicalizedObj = obj.map(function (item) {
      return canonicalize(item, stack);
    });
    stack.pop();
  } else if (typeof obj === 'object' && obj !== null) {
    stack.push(obj);
    canonicalizedObj = {};
    Object.keys(obj).forEach(function (key) {
      canonicalizedObj[key] = canonicalize(obj[key], stack);
    });
    stack.pop();
  } else {
    canonicalizedObj = obj;
  }

  return canonicalizedObj;
};

})();
