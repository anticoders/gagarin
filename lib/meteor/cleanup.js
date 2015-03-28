  var _ = require('lodash');

  process.on('cleanup', function(numberOfFails){
    var self = this;
    var count =0;
    var noc = !!this.cleanups && this.cleanups.length;
    if(!noc){
      process.exit();
    }
    _.each(this.cleanups, function(cleanUp){
      cleanUp(function(err,res){
        count++;
        if(count === noc){
          if(numberOfFails){
            process.exit(numberOfFails);
          }else{
            process.exit();
          }
        }
      });
    });
  });

  // catch ctrl+c event and cleanup
  process.on('SIGINT', function () {
    process.emit('cleanup');
  });

  //catch uncaught exceptions, clean
  process.on('uncaughtException', function(e) {
    process.emit('cleanup');
  });

  process.registerCleanup = function(cleanup){
    this.cleanups = this.cleanups || [];
    this.cleanups.push(cleanup);
  };
