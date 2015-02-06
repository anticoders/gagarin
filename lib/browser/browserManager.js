
var portscanner = require('portscanner');
var Promise     = require('es6-promise').Promise;
var either      = require('../tools').either;
var url         = require('url');
var wd          = require('wd');
var http        = require('http');
var fs          = require('fs');
var portscanner = require('portscanner')

module.exports = function createBrowserManager (options) {
  "use strict";

  var driverLocation    = options.webdriver || "http://localhost:9515"; // chromedriver default
  var browser           = wd.remote(driverLocation); 
  var dontWaitForMeteor = options.dontWaitForMeteor !== undefined ? !!options.dontWaitForMeteor : false;
  var meteorLoadTimeout = options.meteorLoadTimeout !== undefined ? options.meteorLoadTimeout : 2000;
  var capabilities      = options.capabilities || {};
  var windowSize        = options.windowSize;
  var myLocation        = options.location || "http://localhost:3000";
  var browserPromise    = null;
  var getDDPSetup       = typeof myLocation === 'string' ? Promise.resolve(myLocation) : myLocation.getDDPSetup;

  if (!getDDPSetup) {
    throw new Error('the location option must be either string or a meteor server');
  }

  return function getBrowser () {

    var isInitialized = false;

    if (browserPromise) {
      return browserPromise;
    }

    browserPromise = new Promise(function (resolve, reject) {

      function _reject (err) {
        if (isInitialized) {
          browser.quit();
        }
        if (typeof err === 'string') {
          return reject(new Error(err));
        }
        reject(err);
      }

      var driverLocationParsed = url.parse(driverLocation);

      portscanner.checkPortStatus(driverLocationParsed.port, driverLocationParsed.hostname, function (err, status) {
        if (err || status !== 'open') {
          return _reject(err || 'webdriver not found on ' + driverLocation);
        }

        // NOTE: it was not easy to find in the docs, so I am leaving it here as a comment
        // capabilities.loggingPrefs = { "driver": "INFO", "browser": "INFO" };

        browser.init(capabilities, either(_reject).or(function () {
          
          isInitialized = true;
          
          if (windowSize) {
            browser.setWindowSize(windowSize.width, windowSize.height, either(_reject).or(function () {
              afterResize(either(_reject).or(resolve));
            }));
          } else {
            afterResize(either(_reject).or(resolve));
          }
        }));
      });
    });

    return browserPromise;
  };

  function afterResize (done) {
    if (getDDPSetup) {
      getDDPSetup().then(function (setup) {
        if (setup.host) {
          getLocation(setup.host, done);
        } else {
          getLocation('http://localhost:' + setup.port, done);
        }
      }).catch(done);
    } else {
      done(null, browser);
    }
  }

  function getLocation (url, done) {
    browser.get(url, function (err) {
      if (err) {
        return done(err);
      }

      if (dontWaitForMeteor) { // already done, so lets just resolve
        return done(null, browser);
      }

      browser.setAsyncScriptTimeout(meteorLoadTimeout, function (err) {
        // XXX asyncScriptTimeout is only relevant in "onStartup" routine
        if (err) {
          return done(err);
        }

        var handle1 = null;
        var handle2 = null;

        handle2 = setTimeout(function () {
          clearTimeout(handle1);
          done(new Error('Meteor code is still not loaded after ' + meteorLoadTimeout + ' ms'));
        }, meteorLoadTimeout);

        // wait until all meteor-related files are loaded
        (function test() {
          browser.execute("return !!window.Meteor && !!window.Meteor.startup", function (err, isOK) {
            if (err) {
              clearTimeout(handle2);
              return done(err);
            }
            if (isOK) {

              //XXX loads chai here, right before the last onStartup
              // just putting here for now, don't know the best place to put it yet
              loadBrowserChai(function(chaiError,chaiOK){
                
                if(chaiError){
                  return done(chaiError);
                }

                if(chaiOK){
                  // XXX proceed with the last step here
                  onStartup(function (err) {
                    clearTimeout(handle2);
                    done(err, !err && browser);
                  });
                }
                
              });
                
            } else {
              handle1 = setTimeout(test, 100);
            }
          });
        })();
      });
    });
  }

  function loadBrowserChai (done) {
    
    // XXX this creates a new server everytime
    // it seems like we should just reuse the same one if it's already running ? 
    var chaiServer = http.createServer(function (request, response) {
  
      fs.readFile('./node_modules/chai/chai.js', function(error, content) {
        if (error) {
          response.writeHead(500);
          response.end();
        }
        else {
          response.writeHead(200, { 'Content-Type': 'text/javascript' });
          response.end(content, 'utf-8');
        }
      });
          
    });

    portscanner.findAPortNotInUse(3001, 3999, '127.0.0.1', function(error, port) {
      
      if(port){
        // load chai.js into the browser and create global 'expect'
        // XXX will 'expect' as a global cause conflicts with the application code ? 
        chaiServer.listen(port,function(){
          var str = "\
          var script=window.document.createElement('script');\
          script.src='http://127.0.0.1:"+port+"/';\
          script.addEventListener('load',function(){expect = chai.expect;});\
          window.document.head.appendChild(script);";
          browser.execute(str);
        });
      }
    });

    function waitForChai (attempts) {
      browser.execute("return !!chai",function(err){
        if(attempts===0){
          done(new Error("Error loading chai.js in the browser"));
        }
        if(err){
          setTimeout(waitForChai, 100, --attempts);
        }else{
          done(null,true);
         }
      });
    }
    waitForChai(20);  // approximately 2 second timeout 
  
  }


  function onStartup (done) {

    browser.executeAsync(function (cb) {
        Meteor.startup(cb);
      }, done);

  }

}
