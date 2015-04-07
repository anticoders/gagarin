(function () {

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

// this is required for mocha reporting to work properly
if (typeof sourceMapSupport !== 'undefined') {
  sourceMapSupport.install();
}

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
    feedback && feedback('fail', clean(test, err));
  });

  runner.on('end', function(){
    feedback && feedback('end', self.stats);
  });
}

function clean(test, err) {
  
  var feedback = {
    name      : test.title,
    result    : !!err ? 'failed' : 'passed',
    ancestors : [],
    timestamp : new Date(),
    duration  : test.duration,
    speed     : test.speed,
  }

  var parent = test.parent;
  do {
    feedback.ancestors.unshift(parent.title);
    parent = parent.parent;
  } while (parent && !parent.root);

  if (err) {

    // this is data that is accepted by Velocity

    feedback.failureType       = Object.hasOwnProperty(err, 'expected') ? 'expect' : 'assert';
    feedback.failureMessage    = err.message;
    feedback.failureStackTrace = err.stack;

    // ... tell everything else we know about this error

    feedback.failureActual     = err.actual;
    feedback.failureExpected   = err.expected;
    feedback.failureShowDiff   = err.showDiff;
    feedback.failureUncaught   = err.uncaught;
  }
  return feedback;
}

})();
