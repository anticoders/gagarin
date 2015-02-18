var Mocha = require('mocha');
var Base  = Mocha.reporters.Base;

var mocha = new Mocha({
  reporter: Gagarin
});

var context = {};

mocha.suite.emit('pre-require', context);

var describe = context.describe;
var it       = context.it;

describe('A test suite', function () {

  it('should be ok', function () {

  });

  it('should throw', function () {
    throw new Error('LOL');
  });

});

mocha.run();

function Gagarin(runner) {
  Base.call(this, runner);

  var self = this
    , stats = this.stats
    , total = runner.total;

  runner.on('start', function(){
    console.log(JSON.stringify(['start', { total: total }]));
  });

  runner.on('pass', function(test){
    console.log(JSON.stringify(['pass', clean(test)]));
  });

  runner.on('fail', function(test, err){
    console.log(JSON.stringify(['fail', clean(test)]));
  });

  runner.on('end', function(){
    process.stdout.write(JSON.stringify(['end', self.stats]));
  });
}

function clean(test) {
  return {
      title: test.title
    , fullTitle: test.fullTitle()
    , duration: test.duration
  }
}
