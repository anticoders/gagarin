var Promise = require('es6-promise').Promise;
var either  = require('./index').either;
var expect  = require('chai').expect;

var portscanner = require('portscanner');

module.exports = function genericPromiseChain(methods, myPrototype, options) {

  options = options || {};

  var defaultAction = typeof options.action === 'function' ? options.action : canonical;
  var transform     = options.transform;

  function GenericPromiseChain (operand, promise, context) {
    var self = this;

    this._operand = operand;
    this._promise = promise || (typeof operand === 'function' ? operand() : operand);
    this._context = context || {};
  }

  GenericPromiseChain.prototype = Object.create(myPrototype);

  [ 'then', 'catch' ].forEach(function (name) {

    GenericPromiseChain.prototype[name] = function () {
      var context = this._context;

      var args = Array.prototype.map.call(arguments, function (func) {
        return func.bind(context);
      });

      this._promise = this._promise[name].apply(this._promise, args);
      return this;
    };

  });

  GenericPromiseChain.prototype.always = function (callback) {
    return this.then(function (result) { callback(null, result) }, callback);
  };

  GenericPromiseChain.prototype.sleep = function (timeout) {
    var self = this;
    return self.then(function () {
      return new Promise(function (resolve) {
        setTimeout(resolve, timeout);
      });
    });
  };

  GenericPromiseChain.prototype.expectError = function (callback) {
    var pattern = '';

    if (typeof callback === 'string') {
      pattern  = callback;
      callback = function (err) { expect(err.message).to.contain(pattern) }
    } else if (callback instanceof RegExp) {
      pattern  = callback;
      callback = function (err) { expect(err.message).to.match(pattern) }
    } else if (callback === undefined) { // noop
      callback = function () {};

    } else if (typeof callback !== 'function') {
      throw new Error('argument for expectError must be a string, RegExp or a function');
    }

    var self = this;

    return self.then(function () {
      throw new Error('error was not thrown');
    }, function (err) {
      expect(err).to.be.instanceof(Error);
      return callback.call(this, err);
    });
  };

  GenericPromiseChain.prototype.noWait = function () {
    /**
     * Use the same operand and context, but don't wait for the current promise.
     */
    return new GenericPromiseChain(this._operand, null, this._context);
  };

  GenericPromiseChain.prototype.branch = function (context) {
    /**
     * Use the same operand and context (unless a new context is provided), and wait for the current promise.
     */
    return new GenericPromiseChain(this._operand, this._promise, context || this._context);
  };

  GenericPromiseChain.prototype.switchTo = function (generic) {
    if (!generic._operand || !generic.branch) {
      throw new Error('can only switchTo another generic');
    }
    var current = this._promise;
    return generic.branch(this._context).then(function () {
      return current;
    });
  };

  GenericPromiseChain.prototype.yet = function (code, args) {
    var args = Array.prototype.slice.call(arguments, 0);
    var self = this;
    //--------------------------------
    return self.catch(function (err) {
      return self.noWait().execute(code, args).then(function (errMessage) {
        throw new Error(err.message + ' ' + errMessage);
      });
    });
  };

  GenericPromiseChain.prototype.getFreePort = function (action) {
    return this.__custom__(function (operand, done) {
      portscanner.findAPortNotInUse(3000, 9999, 'localhost', either(done).or(function (port) {
        done(null, port);
      }));
    });
  };

  GenericPromiseChain.prototype.methods = methods.concat([
    '__custom__',
    'catch',
    'then',
    'always',
    'sleep',
    'expectError',
    'noWait',
    'branch',
    'yet',
    'getFreePort',
  ]);

  GenericPromiseChain.prototype.__custom__ = function (action, onFail) {
    var self = this;

    // this function should either rethrow the error or call the retry function (passed as the second argument)
    onFail = onFail || function (err) { 
      throw err
    };

    self._promise = Promise.all([
      typeof self._operand === 'function' ? self._operand() : self._operand, self._promise
    ]).then(function (all) {

      return new Promise(function (resolve, reject) {
        var operand = all[0];

        if (!operand || typeof operand !== 'object') {
          reject(new Error('GenericPromiseChain: invalid operand'));
        }

        if (action.length === 3) {
          // looks like the user wants to receive the value of the previous promise ...
          action = partial(action, all[1]);
        }

        if (transform) {
          action = transform(action);
        }

        (function doAction(retryCount) {
          action.call(self._context, operand, either(function (err) {
            var retryUsed = false;
            function retry (repair) {
              retryUsed = true;
              // if nothing is provided, use a noop repair function
              repair = repair || function (operand, done) { setTimeout(done); }
              repair.call({}, operand, either(reject).or(function () {
                doAction(retryCount + 1);
              }));
            }
            retry.count = retryCount;
            try {
              onFail(err, retry);
            } catch (err) {
              return cleanError(reject)(err); // stop here
            }
            if (!retryUsed) {
              reject(new Error('The onFail callback should either throw an error or call the `retry` routine immediately.'));
            }
          }).or(resolve));
        })(0);

      });
    });
    return self;
  };

  methods.forEach(function (name) {
    /**
     * Update the current promise and return this to allow chaining.
     */
    GenericPromiseChain.prototype[name] = function () {
      var args = Array.prototype.slice.call(arguments, 0);
      return this.__custom__(function (operand, done) {
        defaultAction.call(this, operand, name, args, done);
      });
    };

  });

  function canonical (operand, name, args, done) {
    if (!operand[name]) {
      done(new Error('GenericPromiseChain: operand does not implement method: ' + name));
    } else {
      args.push(done);
      operand[name].apply(operand, args);
    }
  }

  return GenericPromiseChain;

}

function cleanError(reject) {
  return function (err) {
    if (err){

      if((err instanceof Error) || err.message){
        //err = new Error(err.message);
      } else {
        throw new Error("Unhandled error object")
      }
    }
    reject(err);
  }
}

function partial(func, value) {
  return function () {
    var args = Array.prototype.slice.call(arguments, 0);
    args.unshift(value);
    return func.apply(this, args);
  }
}
