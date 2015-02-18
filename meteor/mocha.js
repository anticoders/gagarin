
var socket = null;

Gagarin.feedback = function feedback (what, data) {
  socket && socket.write(JSON.stringify(_.extend({ what: what }, data)) + '\n');
};

Gagarin.setFeedbackUrl = function setReportsUrl (url, done) {

  var WebSocket = Npm.require('faye-websocket');

  done = _.once(done);

  socket = new WebSocket.Client(url, [], { ping: 1 });

  socket.on('open', function () {
    done();
  });

  socket.on('error', function (err) {
    done(err);
    socket = null;
  });

  socket.on('close', function () {
    done(new Error('socket closed prematurely'));
    socket = null;
  });

}
