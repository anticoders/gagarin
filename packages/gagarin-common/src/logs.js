import chalk from 'chalk';

let verbose = true;
let stream = process.stdout;
let logger = defaultLogger;
let start = new Date();

export const logs = {

  setVerbose (value) {
    verbose = !!value;
  },

  setLogger (value) {
    logger = value || defaultLogger;
  },

  setStream (value) {
    stream = value;
  },

  client (message, options) {
    let color = options && options.isError ? chalk.bgRed.white : chalk.bgYellow.black;
    //--------------------------------------------------------------------------------
    logger({ type: 'client', stream, color, verbose, data: {
      message, time: new Date(), isError: options && options.isError
    } });
  },

  server (message, options) {
    let color = options && options.isError ? chalk.bgRed.white : chalk.bgBlue.white;
    //------------------------------------------------------------------------------
    logger({ type: 'server', stream, color, verbose, data: {
      message, time: new Date(), isError: options && options.isError
    } });
  },

  system (message, options) {
    let color = options && options.isError ? chalk.bgRed.white : chalk.bgMagenta.white;
    //---------------------------------------------------------------------------------
    logger({ type: 'system', stream, color, verbose, data: {
      message, time: new Date(), isError: options && options.isError
    } });
  },

  test (message, options) {
    let color = options && options.isError ? chalk.bgRed.white : chalk.bgGreen.black;
    //-------------------------------------------------------------------------------
    logger({ type: 'test', stream, color, verbose, data: {
      message, time: new Date(), isError: options && options.isError
    } });
  },
};

function defaultLogger ({ type, data, stream, color, verbose }) {
  if (!verbose || !stream) {
    return;
  }
  var prefix = color(align(type, 8)) + timer(data.time - start);
  stream.write(indent(data.message.toString(), prefix, chalk.inverse));
  stream.write('\n');
}

function timer (offset) {

  var seconds = Math.floor(offset / 1000) % 60;
  var minutes = Math.floor(offset / 60000);

  seconds = (seconds < 10 ? '0' : '') + seconds.toString();
  minutes = (minutes < 10 ? '0' : '') + minutes.toString();

  return chalk.bgCyan.black(' ' + minutes + ':' + seconds + ' ');
}

function align (text, width) {
  text = text.substr(0, width);
  while (text.length < width) {
    if (text.length < width) {
      text = text + ' ';
    }
    if (text.length < width) {
      text = ' ' + text;
    }
  }
  return text;
}

function indent(text, prefix, color) {
  if (!color) {
    color = function (x) { return x; }
  }
  return text.toString().split('\n').map(line => {
    let length = chalk.stripColor(prefix + " " + line).length;
    if (line === '\r') {
      return;
    }
    if (line.length === 0) {
      return "";
    }
    if (length < process.stdout.columns) {
      line += new Array(process.stdout.columns - length + 1).join(' ');
    }
    return prefix + color(" " + line);
  }).join('\n');
}
