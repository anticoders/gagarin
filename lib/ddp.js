var DDPClient = require('ddp');
var Promise = require('es6-promise').Promise;

module.exports = function makeDDPClientFactory (ddpSetupProvider) {
  "use strict";

  var self = this;
  var ddpClient = null;
  var ddpClientPromise = null;
  var code = null;
  var port = null;

  return function ddpClientAsPromise () {
    
    return ddpSetupProvider().then(function (setup) {

      if (code === setup.code && port === setup.port && ddpClientPromise) {
        return ddpClientPromise;
      }

      code = setup.code;
      port = setup.port;
      
      ddpClientPromise = new Promise(function (resolve, reject) {
 
        ddpClient && ddpClient.close();

        ddpClient = new DDPClient({
          host : "localhost",
          port : port,
          path : "websocket",
          ssl  : false,
          autoReconnect : true,
          autoReconnectTimer : 500,
          maintainCollections : true,
          ddpVersion : '1'
        });

        ddpClient.connect(function (err, wasReconnected) {
          if (err) {
            return reject(err);
          }
          resolve(ddpClient);
        });

        //-------------------------------------------------------------
        //\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
        //-------------------------------------------------------------
      });

      return ddpClientPromise;
    });
  };

};

