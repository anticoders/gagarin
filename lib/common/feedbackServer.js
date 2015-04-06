var http = require('http');
var sockjs = require('sockjs');
var url = require('url');

module.exports = function createFeedbackServer (port, done) {

  var sockjsOptions = { websocket: true, log: function () {} };
  var sockjsServer = sockjs.createServer(sockjsOptions);
  var httpServer = http.createServer();

  sockjsServer.on('connection', function (socket) {
    socket.on('data', function (data) {
      processDDP(JSON.parse(data), socket, {
        '/gagarin/feedback': function () {
          var args = Array.prototype.slice.call(arguments, 0);
          args.unshift('feedback');
          httpServer.emit.apply(httpServer, args);
        }
      });
    });
  });

  // request handlers
  sockjsServer.installHandlers(httpServer, { prefix: '/sockjs' });
  redirectWebsocketEndpoint(httpServer);

  /**
   * A convenience helper.
   */
  httpServer.onFeedback = function (callback) {
    httpServer.on('feedback', callback);
    return httpServer;
  }

  httpServer.listen(port, done);

  return httpServer;
}

// DDP

var session = 0;

/**
 * The simplest possible DDP server implementation.
 */
function processDDP (data, socket, methods) {
  // TODO: response to other types of messages
  // TODO: check vs DDP specs
  var handler = null;
  if (data.msg === 'method') {
    handler = methods && methods[data.method];
    try {
      if (!handler) {
        throw { error: 404, reason: 'Method not found' };
      }
      socket.write(JSON.stringify({ msg: 'result' , id: data.id, result: handler.apply({}, data.params) }));
    } catch (err) {
      if (err instanceof Error) {
        err = { error: 500, reason: err.message };
      }
      socket.write(JSON.stringify({ msg: 'result' , id: data.id, error: err }))
    } finally {
      socket.write(JSON.stringify({ msg: 'updated', methods: [ data.id ] }));
    }
  } else if (data.msg === 'connect') {
    if (socket._ddpSession !== undefined) {
      socket.write(JSON.stringify({ msg: 'error', reason: 'Already connected' }));
    } else {
      socket._ddpSession = data.session || session++;
      socket.write(JSON.stringify({ msg: 'connected', session: socket._ddpSession }));
    }
  } else if (data.msg === 'ping') {
    socket.write(JSON.stringify({ msg: 'pong', id: data.id }));
  }
}

/**
 * Mimic the original Meteor behavior: /websocket => /sockjs/websocket
 */
function redirectWebsocketEndpoint (server) {
  ['request', 'upgrade'].forEach(function(event) {
    var oldHttpServerListeners = server.listeners(event).slice(0);
    server.removeAllListeners(event);

    // request and upgrade have different arguments passed but
    // we only care about the first one which is always request
    var newListener = function (request) {
      // Store arguments for use within the closure below
      var args = arguments;

      // Rewrite /websocket and /websocket/ urls to /sockjs/websocket while
      // preserving query string.
      var parsedUrl = url.parse(request.url);
      if (parsedUrl.pathname === '/websocket' ||
          parsedUrl.pathname === '/websocket/') {
        parsedUrl.pathname =  '/sockjs/websocket';
        request.url = url.format(parsedUrl);
      }
      oldHttpServerListeners.forEach(function(oldListener) {
        oldListener.apply(server, args);
      });
    };
    server.addListener(event, newListener);
  });  
}
