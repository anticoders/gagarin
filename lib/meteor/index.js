
var createMeteorProcessManager = require('./meteorProcessManager');
var createDDPClientManager     = require('../ddp/ddpClientManager');
var BuildAsPromise             = require('./build');
var MongoDatabase              = require('../mongo/database');
var meteorMethods              = require('./methods');
var Promise                    = require('es6-promise').Promise;
var Closure                    = require('../tools/closure');
var generic                    = require('../tools/generic');
var tools                      = require('../tools');
var url                        = require('url');

module.exports = function createMeteor (options) {
  "use strict";

  options = options || {};

  if (typeof options === 'string') {
    options = { pathToApp: options };
  }

  var pathToApp       = options.pathToApp || path.resolve('.');
  var skipBuild       = !!options.skipBuild;

  var remoteServer    = options.remoteServer ? url.parse(options.remoteServer) : null;
  var mongoUrlPromise = null;
  var databasePromise = null;

  var uniqueCode = Math.random();

  if (typeof options.mongoUrl === 'string') {
    mongoUrlPromise = Promise.resolve(options.mongoUrl);

  } else if (options.mongoUrl && options.mongoUrl.then) {
    mongoUrlPromise = options.mongoUrl;

  } else if (options.mongoUrl) {
    throw new Error('mongoUrl must be a string or a promise returning a string');
  }

  if (!mongoUrlPromise && !remoteServer) {
    databasePromise = new MongoDatabase({ pathToApp: pathToApp });
    mongoUrlPromise = databasePromise.getMongoUrlPromise();
  }

  var helpers = options.helpers || {};

  var myPrototype = Object.create(helpers);

  myPrototype.init = function () {
    return this.branch().then(function () {
      // ...
    });
  }

  myPrototype.start = function () {
    return this.__custom__(function (operand, done) {
      done();
    });
  }

  myPrototype.stop = function () {
    return this.__custom__(function (operand, done) {
      
      operand.ddpClient.close();

      if (!operand.process) { // e.g. if using remote server
        return done();
      }

      operand.process.kill(function (err) {
        if (err) {
          done(err);
        } else if (databasePromise) {
          databasePromise.then(function (db) {
            db.cleanUp(done);
          }).catch(done);
        }
      });
    });
  }

  // TODO: think if this can be implemented outside the manager

  //myPrototype.restart = function (delay) {
  //  var self = this;
  //  return self.then(function () {
  //    uniqueCode = Math.random();
  //    return this.__custom__(function (operand, done) {
  //      done();
  //    });
  //  });
  //}

  var methods = [
    'restart'
  ];

  Object.keys(meteorMethods).forEach(function (name) {
    myPrototype[name] = meteorMethods[name];
  });

  var MeteorGeneric = generic(methods, myPrototype, function (operand, name, args, done) {
    if (!operand.process) {
      done(new Error('operand.process is undefined'));
    } else if (!operand.process[name]) {
      done(new Error('operand.process does not implement method: ' + name));
    } else {
      args.push(done);
      operand.process[name].apply(operand.process, args);
    }
  });

  var Meteor = function () {

    var getMeteorProcess = createMeteorProcessManager(options);
    var getDDPClient     = createDDPClientManager();
    var closure          = null;

    function getPathToMain () {
      return BuildAsPromise({ pathToApp: pathToApp, skipBuild: skipBuild });
    }

    function getMongoUrl () {
      return databasePromise.getMongoUrlPromise();
    }

    function getMeteor () {

      if (remoteServer) {
        return Promise.resolve(null);
      }

      return Promise.all([

        getPathToMain(),
        getMongoUrl(),

      ]).then(function (all) {
        
        var pathToMain = all[0];
        var mongoUrl   = all[1];

        return getMeteorProcess({
          pathToNode : tools.getNodePath(pathToApp),
          pathToMain : pathToMain,
          uniqueCode : uniqueCode,
          mongoUrl   : mongoUrl,
        });

      });
    }

    function operand () {

      return Promise.all([

        getDDPSetup(),
        getMeteor(),

      ]).then(function (all) {

        var setup = all[0];
        var process = all[1];
        
        return getDDPClient(setup).then(function (ddpClient) {
          return { ddpClient: ddpClient, process: process, closure: closure };
        });
        
      });
    }

    function getDDPSetup () {
      
      if (remoteServer) {
        return Promise.resolve({
          host: remoteServer.hostname,
          port: remoteServer.port || 443,
        });
      }

      return getMeteor().then(function (process) {
        return {
          port: process.env.PORT,
          code: process.pid,
        };
      });

    }

    this._ddpSetupProvider = getDDPSetup;

    MeteorGeneric.call(this, operand);

    Closure.mixin(this); // adds "useClosure" and "closure" methods
    closure = this.closure.bind(this);

  };

  Meteor.prototype = Object.create(new MeteorGeneric(), {
    methods: { value: [].concat(Object.keys(myPrototype), Object.keys(helpers), MeteorGeneric.prototype.methods) }
  });

  return new Meteor();

}
