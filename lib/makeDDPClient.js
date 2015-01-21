var generic = require('./generic');
var ddp     = require('./ddp');

module.exports = function makeDDPClient (ddpSetupProvider, myPrototype) {

  var methods = [
    'call',
    'apply',
    'subscribe',
    'close',
  ];

  myPrototype = myPrototype || {};

  myPrototype.login = function (data) {
    return this.call('login', [ data ]);
  };

  myPrototype.logout = function () {
    return this.call('logout', []);
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
