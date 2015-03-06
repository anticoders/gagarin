  var _ = require('underscore');

  process.on('cleanup', function(){
    var self = this;
    var count =0;
    var noc = !!this.childs && this.childs.length;
    if(!noc){
      process.exit();
    }
    _.each(this.childs, function(child){
      child.process.kill('SIGINT');
      child.cleanup(child.process.pid, function(err){
        count++;
        if(count === noc){
          process.exit();
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

  process.registerChild = function(params){
    this.childs = this.childs || [];
    this.childs.push(params);
  };
