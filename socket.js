var net = require('net');
var Promise = require('es6-promise').Promise;

module.exports = function makeSocketFactory (emitter, meteorAsPromise) {

  var self = this;
  var socket = null;
  var socketPort = null;
  var socketPromise = null;

  return function socketAsPromise () {
    
    return meteorAsPromise().then(function (meteor) {

      if (socketPort === meteor.gagarinPort && socketPromise) {
        return socketPromise;
      }

      socketPort = meteor.gagarinPort;
      
      socketPromise = new Promise(function (resolve, reject) {

        socket && socket.destroy();
        socket = net.createConnection(socketPort, function () {
          resolve(socket);
        });

        //--------------- PARSE RESPONSE FROM SERVER ------------------
        socket.setEncoding('utf8');
        socket.on('data', function (data) {
          try {
            data = JSON.parse(data);
            //----------------------
            if (data.error) {
              if (data.name) {
                emitter.emit(data.name, new Error(data.error));
              } else {
                emitter.emit('error', new Error(data.error));
              }
            } else {
              // XXX note that the first argument must be an error
              data.name && emitter.emit(data.name, null, data.result);
            }
          } catch (err) { // parse error?
            emitter.emit('error', err);
          }
        });
        //-------------------------------------------------------------
        //\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
        //-------------------------------------------------------------
      });

      return socketPromise;
    });
  };

};

