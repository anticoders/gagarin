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

var Mocha = Npm.require('mocha');
var mocha = new Mocha({ reporter: Laika });
mocha.suite.emit('pre-require', Gagarin);
describe = Gagarin.describe;
it = Gagarin.it;

Gagarin._runMocha = function (done) {
  mocha.run(function () {
    done();
  });
};

var Base  = Mocha.reporters.Base;

function Laika(runner) {
  Base.call(this, runner);

  var self  = this;
  var stats = this.stats;
  var total = runner.total;

  runner.on('start', function() {
    Gagarin.report && Gagarin.report('start', { total: total });
  });

  runner.on('pass', function(test){
    Gagarin.report && Gagarin.report('pass', clean(test));
  });

  runner.on('fail', function(test, err){
    Gagarin.report && Gagarin.report('fail', clean(test));
  });

  runner.on('end', function(){
    Gagarin.report && Gagarin.report('end', self.stats);
    //if (self.stats.failures) {
    //  Base.list(self.failures);
    //}
  });
}

function clean(test) {
  return {
    title: test.title,
    fullTitle: test.fullTitle(),
    duration: test.duration,
  }
}

})();
