var Promise = require('es6-promise').Promise;
var generic = require('./generic');
var ddp     = require('./ddp');

var defaultGiveUpTimeout = 100;

module.exports = function makeDDPClient (ddpSetupProvider, helpers) {

  // TODO: check if arguments are ok

  var dataUpdatedPromise = Promise.resolve();

  var methods = [];

  helpers = helpers || {};

  myPrototype = Object.create(helpers);

  myPrototype.login = function (data) {
    return this.call('login', [ data ]);
  };

  myPrototype.logout = function () {
    return this.call('logout', []);
  };

  myPrototype.waitForUpdates = function (name) {
    var myPromise = dataUpdatedPromise;
    return this.__custom__(function (operand, cb) {
      myPromise
        .then(function () {
          cb(null, name && operand.collections[name]);
        })
        .catch(cb);
    });
  };

  myPrototype.subscribe = function (name, args) {
    args = args || [];
    return this.__custom__(function (operand, cb) {
      var myId = operand.subscribe(name, args, function (err) {
        if (err) {
          cb(err);
        } else {
          cb(null, myId);
        }
      });
    });
  };

  myPrototype.unsubscribe = function (id) {
    return this.__custom__(function (operand, cb) {
      operand.unsubscribe(id);
      cb();
    });
  };

  myPrototype.subscribeNoWait = function (name, args, options) {
    options = options || {};
    args = args || [];
    return this.__custom__(function (operand, cb) {
      cb = once(cb);
      operand.subscribe(name, args, cb);
      setTimeout(cb, options.giveUpTimeout || defaultGiveUpTimeout);
    });
  };

  myPrototype.collection = function (name) {
    return this.__custom__(function (operand, cb) {
      cb(null, operand.collections[name]);
    });
  };

  myPrototype.call = function (name, args) {
    var myPromise = null;
    var myResolve;

    args = args || [];

    dataUpdatedPromise = dataUpdatedPromise.then(function () {
      return myPromise = myPromise || new Promise(function (resolve) {
        myResolve = resolve;
      });
    });

    return this.__custom__(function (operand, cb) {
      operand.call(name, args, cb, function () {
        if (myPromise) {
          myResolve();
        } else {
          myPromise = Promise.resolve();
        }
      });
    });
  };

  var DDPGeneric = generic(methods, myPrototype);

  var DDPClient = function () {
    DDPGeneric.call(this, ddp(ddpSetupProvider));
  };

  DDPClient.prototype = Object.create(new DDPGeneric(), {
    methods: { value: [].concat(Object.keys(myPrototype), Object.keys(helpers), DDPGeneric.prototype.methods) }
  });

  return new DDPClient();

}

/**
 * Make a version of function that can only be called once.
 */
function once (cb) {
  var done = false;
  return function () {
    if (done) {
      return;
    }
    done = true;
    return cb.apply(this, arguments);
  }
}
