
module.exports.table = require('./table');

var isBlocked = false;
var secret    = 0;

var stdout_write;
var stderr_write;

// TODO: think what to do next; do we even need these hacks?

if (process.stdout && process.stdout._write) {
  stdout_write = process.stdout._write.bind(process.stdout);
  process.stdout._write = function () {
    "use strict";

    var args = Array.prototype.slice.call(arguments, 0);

    if (isBlocked) {
      args[0] = '';
      args[1] = null;
    }
    return stdout_write.apply(null, args);
  }
}

if (process.stderr && process.stderr._write) {
  stderr_write = process.stderr._write.bind(process.stderr);
  process.stderr._write = function () {
    "use strict";
    var args = Array.prototype.slice.call(arguments, 0);
    if (isBlocked) {
      args[0] = '';
      args[1] = null;
    }
    return stderr_write.apply(null, args);
  }
};

module.exports.block = function block () {
  "use strict";

  var mySecret = secret = Math.random();

  isBlocked = true;

  return function write (data) {
    if (!stdout_write) {
      return;
    }
    if (mySecret !== secret) {
      // someone has blocked after we did it
      return;
    }
    return stdout_write.call(null, data, null, function () {});
  }
}

module.exports.unblock = function unblock () {
  "use strict";
  isBlocked = false;
};
