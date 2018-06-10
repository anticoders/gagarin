var DDPClient = require('ddp');
var Promise = require('es6-promise').Promise;

module.exports = function createDDPClientManager () {
  var self = this;
  var ddpClient = null;
  var ddpClientPromise = null;
  var code = null;
  var port = null;
  var host = null;

  return function getDDPClient (setup) {

    if (code === setup.code && port === setup.port && ddpClientPromise) {
      return ddpClientPromise;
    }

    code = setup.code;
    port = setup.port;
    host = setup.hostname || 'localhost';
    
    ddpClientPromise = new Promise(function (resolve, reject) {

      ddpClient && ddpClient.close();

      ddpClient = new DDPClient({
        host : host,
        port : port,
        path : "websocket",
        ssl  : false,
        //-------------------------
        autoReconnect       : true,
        autoReconnectTimer  : 500,
        maintainCollections : true,
        ddpVersion          : '1'
      });

      var retryCount = 5;

      // XXX we need this because the WebApp.httpServer may start with some delay;
      //     in fact, this should be handled within the app itself
      (function tryConnect() {
        ddpClient.connect(function (err, wasReconnected) {
          if (err) {
            if (retryCount <= 0) {
              if(typeof err === 'string'){
                throw new Error(err);
              } else {
                reject(err)
              }
            } else if (!wasReconnected) {
              retryCount -= 1;
              setTimeout(tryConnect, 500);
            }
          } else {
            resolve(ddpClient);
          }
        });
      })();

      // TODO: re-enable this feature when we make timeout configurable
      //setTimeout(function () {
      //  reject(new Error('timeout while waiting to establish ddp connection'));
      //}, 2000);

      //-------------------------------------------------------------
      //\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
      //-------------------------------------------------------------
    });

    return ddpClientPromise;

  };

};

