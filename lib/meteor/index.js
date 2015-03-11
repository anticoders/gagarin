
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
var path                       = require('path');
var fs                         = require('fs');
var version                    = require('../../package.json').version;

module.exports = function createMeteor (options) {
  "use strict";
  options = options || {};
  if (typeof options === 'string') {
    options = { pathToApp: options };
  }
  var pathToApp = options.pathToApp || path.resolve('.');
  var skipBuild = !!options.skipBuild;
  var verbose   = !!options.verbose;

  var remoteServer    = options.remoteServer ? url.parse(options.remoteServer) : null;
  var mongoUrlPromise = null;
  var databasePromise = null;

  var getMeteorProcess = createMeteorProcessManager(options);
  var getDDPClient     = createDDPClientManager();
  var closure          = null;

  var getConfig = function () { return Promise.reject(new Error('meteor must be initialized before use')) };

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

  // custom methods

  myPrototype.init = function (config) {
    getConfig = function () {
      return Promise.resolve(config);
    }
    return this;
  }

  myPrototype.start = function (onStart) {
    return this.then(function () {
      console.warn('\n  meteor.start is now deprecated; use meteor.startup instead\n');
    })
    .startup(onStart);
  }

  myPrototype.startup = function (onStart) {
    var self = this;

    return self.promise(function (resolve) { // wait on startup first
      Meteor.startup(resolve);

    }).then(function () {

      if (typeof onStart === 'function') {
        return onStart.length ? self.noWait().promise(onStart) : self.noWait().execute(onStart);

      } else if (onStart !== undefined) {
        throw new Error('onStart has to be a function');
      }

    });
  }

  myPrototype.stop = function () {

    // TODO: do not start if we haven't done it yet

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

  var methods = [ // copy/pasted meteor process methods
    'restart'
  ];

  Object.keys(meteorMethods).forEach(function (name) {
    myPrototype[name] = meteorMethods[name];
  });

  var MeteorGeneric = generic(methods, myPrototype, {
    action: function (operand, name, args, done) {
      if (!operand.process) {
        done(new Error('operand.process is undefined'));
      } else if (!operand.process[name]) {
        done(new Error('operand.process does not implement method: ' + name));
      } else {
        args.push(done);
        operand.process[name].apply(operand.process, args);
      }
    },
  });

  // create an object inheriting from MeteorGeneric

  var meteor = Object.create(new MeteorGeneric(), {
    methods: { value: [].concat(Object.keys(myPrototype), Object.keys(helpers), MeteorGeneric.prototype.methods) }
  });

  MeteorGeneric.call(meteor, getOperand);

  meteor.getDDPSetup = getDDPSetup;

  // add closure mixins, i.e. "useClosure" and "closure" methods

  Closure.mixin(meteor);
  closure = meteor.closure.bind(meteor);

  // helper functions producing usefull promises

  function getPathToMain () {
    return BuildAsPromise({ pathToApp: pathToApp, skipBuild: skipBuild, verbose: verbose });
  }

  function getMongoUrl () {
    return databasePromise.getMongoUrlPromise();
  }

  function getMeteor () {
    try {
      checkIfVersionsMatch(pathToApp)
    } catch (err) {
      return Promise.reject(err);
    }

    if (remoteServer) {
      return Promise.resolve(null);
    }

    return Promise.all([

      getPathToMain(), getMongoUrl()

    ]).then(function (results) {


      return getMeteorProcess({
        pathToNode : tools.getNodePath(pathToApp),
        pathToMain : results[0],
        mongoUrl   : results[1],
      });

    });
  }

  function getOperand () {

    //NOTE: we can potentially use the "getConfig()" promise to provide some async configuration

    return Promise.all([

      getDDPSetup(), getMeteor(), getConfig()

    ]).then(function (results) {

      return getDDPClient(results[0]).then(function (ddpClient) {
        return { ddpClient: ddpClient, process: results[1], closure: closure };
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

  return meteor;

}

function checkIfVersionsMatch(pathToApp) {

  var pathToVersions = path.join(pathToApp, '.meteor', 'versions');
  var versions       = fs.readFileSync(pathToVersions, 'utf-8');
  var versionMatch   = versions.match(/anti:gagarin@(.*)/);
  if (!versionMatch) { // looks like gagarin is not even instaled
    throw new Error('Please add anti:gagarin to your app before running tests.');
  } else if (versionMatch[1] !== version) { // versions of gagarin are not compatible
    throw new Error(
      'Versions of node package (' + version +
      ') and meteor package (' + versionMatch[1] +
      ') are not compatible; please update.'
    );
  }

}
