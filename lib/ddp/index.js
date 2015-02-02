var Promise = require('es6-promise').Promise;
var generic = require('../tools/generic');

var createDDPClientManager = require('./ddpClientManager');

var defaultGiveUpTimeout = 100;

module.exports = function makeDDPClient (getDDPSetup, helpers) {

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
    if (args && !Array.isArray(args)) {
      throw new Error('in subscribe the second argument must be an array of arguments');
    }
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

  myPrototype.collection = function (name) {
    return this.__custom__(function (operand, cb) {
      cb(null, operand.collections[name]);
    });
  };

  myPrototype.call = function (name, args) {
    if (args && !Array.isArray(args)) {
      throw new Error('in subscribe the second argument must be an array of arguments');
    }
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

    var getDDPClient = createDDPClientManager();

    function ddpClient () {
      return getDDPSetup().then(function (setup) {
        return getDDPClient(setup);
      });
    }

    DDPGeneric.call(this, ddpClient);
  };

  DDPClient.prototype = Object.create(new DDPGeneric(), {
    methods: { value: [].concat(Object.keys(myPrototype), Object.keys(helpers), DDPGeneric.prototype.methods) }
  });

  return new DDPClient();

}

