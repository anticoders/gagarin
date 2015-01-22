var Promise = require('es6-promise').Promise;
var generic = require('./generic');
var ddp     = require('./ddp');

module.exports = function makeDDPClient (ddpSetupProvider, myPrototype) {

  // TODO: check if arguments are ok

  var dataUpdatedPromise = Promise.resolve();

  var methods = [];

  myPrototype = myPrototype || {};

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
          cb(null, operand.collections[name]);
        })
        .catch(cb);
    });
  };

  myPrototype.subscribe = function (name, args) {
    args = args || [];
    return this.__custom__(function (operand, cb) {
      operand.subscribe(name, args, cb);
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
    methods: { value: Object.keys(myPrototype).concat(DDPGeneric.prototype.methods) }
  });

  return new DDPClient();

}
