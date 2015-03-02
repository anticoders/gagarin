
var Base = require('mocha').reporters.Base;
var chalk = require('chalk');

module.exports = function table (listOfStats, write) {

  var labels = [];
  var titles = [];
  var symbol = '\u25A0';

  write = write || process.stdout.write.bind(process.stdout);

  listOfStats.forEach(function (stats, index) {
    titles[index] = stats.title || '';
    labels[index] = (index + 1) + "";
  });

  // trim titles to be at most 20 characters
  titles = titles.map(function (title) {
    if (title.length > 20) {
      return title.substr(0, 17) + '...';
    }
    return title;
  });

  var maxLabel  = labels.reduce(function (memo, value) { return Math.max(memo, value.length); }, 0);
  var maxTitle  = titles.reduce(function (memo, value) { return Math.max(memo, value.length); }, 0);

  // align right
  labels = labels.map(function (value) {
    while (value.length < maxLabel) {
      value = ' ' + value;
    }
    return value;   
  });

  // align left
  titles = titles.map(function (value) {
    while (value.length < maxTitle) {
      value = value + ' ';
    }
    return value;    
  });

  listOfStats.forEach(function (stats, index) {
    if (!!stats.end && stats.passes > 0) {
      write(stats.failures > 0 ? chalk.red('[' + Base.symbols.err + ']') : chalk.green('[' + Base.symbols.ok + ']'));
    } else {
      write(chalk.grey('[ ]'));
    }
    write(' ' + labels[index] + '. ');
    if (titles[index]) {
      write(titles[index] + ' ' + (stats.end ? '|' : '*'));
    }

    // draw "progress bar"
    write(' ' + stats.progress.map(function (data) {
      if (data.what === 'passed') {
        return chalk.green(symbol);
      } else if (data.what === 'skipped') {
        return chalk.cyan(symbol);        
      } else if (data.what === 'failed') {
        return chalk.red('(') + chalk.grey(data.index) + chalk.red(')');
      }
    }).join(''));

    write('\n');
  });

  // number of lines added
  return listOfStats.length;
}

