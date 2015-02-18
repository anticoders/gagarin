var http = require('http');
var sockjs = require('sockjs');

module.exports = function createFeedbackServer (port, done) {

  var http = require('http');
  var sockjs = require('sockjs');

  var sockjs_opts = { websocket: true, log: function () {} };

  var sockjs_server = sockjs.createServer(sockjs_opts);

  sockjs_server.on('connection', function (socket) {

    var buffer = '';

    socket.on('data', function (message) {
      message = buffer + message;
      buffer = '';

      message.split('\n').forEach(function (chunk) {
        try {
          server.emit('feedback', JSON.parse(chunk));
        } catch (err) { // probably a parse error
          buffer = chunk;
        }
      });
    });
  });

  var server = http.createServer();

  // XXX: do we need this one?
  server.addListener('upgrade', function(req,res) {
    res.end();
  });

  sockjs_server.installHandlers(server, { prefix: '/echo' });

  server.listen(port, function () {
    done();
  });

  server.onFeedback = function (callback) {
    server.on('feedback', callback);
    return server;
  }

  return server;

}

