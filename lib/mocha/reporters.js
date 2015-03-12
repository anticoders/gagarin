
var Mocha  = require('mocha');
var Base   = require('mocha').reporters.Base;

module.exports.createParallelReporterFactory = function createParallelReporterFactory (onUpdate) {

  var startedAt   = null;
  var allStats    = [];
  var allFailures = [];

  function update() {
    onUpdate && onUpdate(allStats, new Date() - startedAt);
  }

  function ReporterFactory (index) {

    return function ParallelReporter (runner) {

      Base.call(this, runner);

      // these two guys are already created by the Base reporter
      var stats = this.stats;

      allStats[index] = stats;

      runner.on('suite', function (suite) {
        stats.title = getRootTitle(suite);
        update();
      });

      runner.on('start', function () {
        if (!startedAt) {
          startedAt = new Date();
        }
        stats.progress = [];
        update();
      });

      runner.on('pass', function () {
        stats.progress.push({ what: 'passed' });
        update();        
      });

      runner.on('fail', function (test, err) {
        allFailures.push(test);

        stats.progress.push({ what: 'failed', index: allFailures.length });
        update();
      });

      runner.on('pending', function (test) {
        stats.progress.push({ what: 'skipped' });
        update();
      });

      runner.on('end', function () {
        update();
      });

      // find a root suite for this test and return it's title
      function getRootTitle(test) {
        if (!test) {
          return;
        }
        return getRootTitle(test.parent) || test.title;
      }     
    };
  }

  ReporterFactory.epilogue = function () {
    Base.prototype.epilogue.call({
      stats    : mergeStats(allStats),
      failures : allFailures,
    });
  }

  ReporterFactory.reset = function () {
    allStats    = [];
    allFailures = [];
  }

  function mergeStats (listOfStats) {
    var combined = {
      pending: 0,
      passes: 0,
      failures: 0,
      tests: 0,
      suites: 0,
      duration: 0,
    };
    listOfStats.forEach(function (stats) {
      Object.keys(combined).forEach(function (key) {
        combined[key] += stats[key] !== undefined ? stats[key] : 0;
      });
    });
    return combined;
  }

  return ReporterFactory;

}


