var net = require('net');
var chalk = require('chalk');
var Promise = require('es6-promise').Promise;

module.exports = function makeSocketFactory (emitter, requestGagarinConfig) {

  var self = this;
  var socket = null;
  var socketPort = null;
  var socketPromise = null;

  return function socketAsPromise () {
    
    return requestGagarinConfig().then(function (config) {

      if (socketPort === config.gagarinPort && socketPromise) {
        return socketPromise;
      }

      socketPort = config.gagarinPort;
      
      socketPromise = new Promise(function (resolve) {
        // XXX note that we do not reject explicitly

        socket && socket.destroy();
        socket = net.createConnection(socketPort, function () {
          resolve(function transmit (payload, callback) {
            socket.write(JSON.stringify(payload) + '\n', callback);
          });
        });

        //--------------- PARSE RESPONSE FROM SERVER ------------------
        socket.setEncoding('utf8');
        socket.on('data', function (chunk) {
          // TODO: it's also possible that the JSON object is splited into several chunks

          chunk.split('\n').forEach(function (line) {
            var data;

            // ignore empty lines
            if (line === '' || line === '\r') return;

            try {
              data = JSON.parse(line);
            } catch (err) { // parse error
              emitter.emit('error', new Error('while parsing ' + chalk.blue(line) + ' => ' + err.message));
              return;
            }

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

