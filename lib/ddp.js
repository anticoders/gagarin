var DDPClient = require('ddp');

var chalk = require('chalk');
var Promise = require('es6-promise').Promise;

module.exports = function makeDDPClientFactory (requestGagarinConfig) {
  "use strict";

  var self = this;
  var ddpClient = null;
  var ddpClientPromise = null;
  var uniqueToken = null;

  return function ddpClientAsPromise () {
    
    return requestGagarinConfig().then(function (config) {

      if (uniqueToken === config.uniqueToken && ddpClientPromise) {
        return ddpClientPromise;
      }

      uniqueToken = config.uniqueToken;
      
      ddpClientPromise = new Promise(function (resolve, reject) {
        // XXX note that we do not reject explicitly

        // TODO: meteroPort may change?
        //       allow different things than localhost

        ddpClient && ddpClient.close();

        ddpClient = new DDPClient({
          // All properties optional, defaults shown
          host : "localhost",
          port : config.meteorPort,
          path : "websocket",
          ssl  : false,
          autoReconnect : true,
          autoReconnectTimer : 500,
          maintainCollections : true,
          ddpVersion : '1'  // ['1', 'pre2', 'pre1'] available
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

