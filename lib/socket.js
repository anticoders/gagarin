var net = require('net');
var chalk = require('chalk');
var Promise = require('es6-promise').Promise;

module.exports = function makeSocketFactory (emitter, requestMeteorProcess) {

  var self = this;
  var socket = null;
  var socketPort = null;
  var socketPromise = null;

  return function socketAsPromise () {
    
    return requestMeteorProcess().then(function (meteorProcess) {

      if (socketPort === meteorProcess.gagarinPort && socketPromise) {
        return socketPromise;
      }

      socketPort = meteorProcess.gagarinPort;
      
      socketPromise = new Promise(function (resolve, reject) {

        socket && socket.destroy();
        socket = net.createConnection(socketPort, function () {
          resolve(socket);
        });

        //--------------- PARSE RESPONSE FROM SERVER ------------------
        socket.setEncoding('utf8');
        socket.on('data', function (chunk) {
          chunk.split('\n').forEach(function (line) {
            var data;

            // ignore empty lines
            if (line === '' || line === '\r') return;

            try {
              data = JSON.parse(line);
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
              emitter.emit('error', new Error('while parsing ' + chalk.blue(line) + ' => ' + err.message));
            }
          });
        });
        //-------------------------------------------------------------
        //\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
        //-------------------------------------------------------------
      });

      return socketPromise;
    });
  };

};

