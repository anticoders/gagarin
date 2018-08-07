var expect = require('chai').expect;
var either = require('../tools').either;
var logs = require('../logs');
var Promise = require('es6-promise').Promise;
var DEFAULT_TIMEOUT = 5000;

// these two guys are required for screenshots
var fs = require('fs');
var path = require('path');

module.exports = {

  addScript: function (url, verify, args) {
    var self = this;
    return self.promise(function (resolve, reject, url) {
      var script = window.document.createElement('script');
      script.src = url;
      script.addEventListener('load', resolve);
      window.document.head.appendChild(script);
    }, [ url ]).then(function () {
      if (verify) {
        return self.noWait().execute(verify, args).then(function (success) {
          if (!success) {
            throw new Error('Script ' + url + ' has loaded but it seems that it does not contain the expected content.');
          }
        });
      }
    });
  },

  waitForDOM: function (selector, timeout) {
    if(gagarinOptions.verbose)
      logs.client(`Waiting for DOM: ${selector} for ${timeout || DEFAULT_TIMEOUT}ms`);

    return this.wait(timeout || DEFAULT_TIMEOUT, 'until element ' + selector + ' is present', function (selector, verbose) {
      if(verbose)
        console.log(`Waiting for DOM: ${selector}`);
      return !!document.querySelector(selector);
    }, [ selector, gagarinOptions.verbose ]);
  },

  waitUntilGone: function (selector, timeout) {
    if(gagarinOptions.verbose)
      logs.client(`Waiting until gone: ${selector} for ${timeout || DEFAULT_TIMEOUT}ms`);

    return this.wait(timeout || DEFAULT_TIMEOUT, 'until element ' + selector + ' is gone', function (selector, verbose) {
      if(verbose)
        console.log(`Waiting until gone: ${selector}`);
      return !document.querySelector(selector);
    }, [ selector, gagarinOptions.verbose ]);
  },

  waitUntilNotVisible: function (selector, timeout) {
    if(gagarinOptions.verbose)
      logs.client(`Waiting until not visible: ${selector} for ${timeout || DEFAULT_TIMEOUT}ms`);

    return this.wait(timeout || DEFAULT_TIMEOUT, 'until element ' + selector + ' is hidden', function (selector, verbose) {
      if(verbose)
        console.log(`Waiting until not visible: ${selector}`);
      var element = document.querySelector(selector);
      if(!!element){
        return element.offsetWidth <= 0 && element.offsetHeight <= 0;
      }else{
        return false;
      }
    }, [ selector, gagarinOptions.verbose ]);
  },

  getText: function (selector) {
    if(gagarinOptions.verbose)
      logs.client("Get text: " + selector);

    return this.waitForDOM(selector).execute(function (selector, verbose) {
      if(verbose)
        console.log(`Get text: ${selector}`);
      var element = document.querySelector(selector);
      return element && element.innerHTML;
    }, [ selector, gagarinOptions.verbose ]);
  },

  //getText: function (selector) {
  //  return this.waitForDOM(selector).execute(function (selector) {
  //    return $(selector).text();
  //  }, selector);
  //},

  getValue: function (selector) {
    if(gagarinOptions.verbose)
      logs.client("Get value: " + selector);

    return this.waitForDOM(selector).execute(function (selector, verbose) {
      if(verbose)
        console.log(`Get value: ${selector}`);
      var element = document.querySelector(selector);
      return element && element.value;
    }, [ selector, gagarinOptions.verbose ]);
  },

  getClass: function (selector) {
    if(gagarinOptions.verbose)
      logs.client("Get class: " + selector);

    return this.waitForDOM(selector).execute(function (selector, verbose) {
      if(verbose)
        console.log(`Get class: ${selector}`);
      var element = document.querySelector(selector);
      return (element && element.className) || '';
    }, [ selector, gagarinOptions.verbose ]);
  },

  //click: function (selector, timeout) {
  //  return this.waitForDOM(selector).execute(function (selector) {
  //    click(selector);
  //  }, selector);
  //},

  //clickIfExists: function (selector) {
  //  return this.execute(function (selector) {
  //    click(selector);
  //  }, selector);
  //},

  setValue: function (selector, value) {
    if(gagarinOptions.verbose)
      logs.client("Set value: " + selector);

    return this.waitForDOM(selector).execute(function (selector, value, verbose) {
      if(verbose)
        console.log(`Set value: ${selector}`);
      var element = document.querySelector(selector);
      if (element) {
        element.value = value;
      }
    }, [ selector, value, gagarinOptions.verbose ]);
  },

  focus: function (selector) {
    if(gagarinOptions.verbose)
      logs.client("Call focus: " + selector);

    return this.waitForDOM(selector).execute(function (selector, verbose) {
      if(verbose)
        console.log(`Call focus: ${selector}`);
      var element = document.querySelector(selector);
      element && element.focus();
    }, [ selector, gagarinOptions.verbose ]);
  },
  
  blur: function (selector) {
    if(gagarinOptions.verbose)
      logs.client("Call blur: " + selector);

    return this.waitForDOM(selector).execute(function (selector, verbose) {
      if(verbose)
        console.log(`Call blur: ${selector}`);
      var element = document.querySelector(selector);
      element && element.blur();
    }, [ selector, gagarinOptions.verbose ]);
  },

  click: function (selector, keys) {
    let originalError = new Error();
    if(gagarinOptions.verbose)
      logs.client("Clicking: " + selector);

    let self = this;
    return this.execute(function (selector, keys, verbose) {
      if(verbose)
        console.log(`Clicking: ${selector} keys: ${keys}`);
    }, [ selector, keys, gagarinOptions.verbose ]).then(function(){
      return self.__custom__(function (operand, done) {
        operand.browser.elementByCssSelectorOrNull(selector, done);
      }).then(function (element) {
        if (!element) {
          throw new Error('element ' + selector + ' does not exists');
        }
        return new Promise(function (resolve, reject) {
          element.click(either(reject, originalError).or(resolve));
        });
      });
    });
  },

  // we should probably call this helper "typeKeys"
  //typeKeys: function (selector, keys) {
  // do we need focus and blur?
  //  return this.waitForDOM(selector)
  //             .focus(selector)
  //             .sendKeys(selector, keys)
  //             .blur(selector);
  //},
  
  sendKeys: function (selector, keys) {
    let originalError = new Error();
    if(gagarinOptions.verbose)
      logs.client(`Sending keys: ${selector} keys: ${keys}`);

    let self = this;
    return this.execute(function (selector, keys, verbose) {
      if(verbose)
        console.log(`Sending keys: ${selector} keys: ${keys}`)
    }, [ selector, keys, gagarinOptions.verbose ]).then(function(){
      return self.__custom__(function (operand, done) {
        operand.browser.elementByCssSelectorOrNull(selector, done);
      }).then(function (element) {
        if (!element) {
          throw new Error('element ' + selector + ' does not exists');
        }
        return new Promise(function (resolve, reject) {
          element.sendKeys(keys, either(reject, originalError).or(resolve));
        });
      });
    });
  },

  signUp: function (options) {
    let originalError = new Error();
    if(gagarinOptions.verbose)
      logs.client(`Signup: ${JSON.stringify(options)}`);

    return this.promise(function (resolve, reject, options, verbose) {
      if(verbose)
        console.log(`Signup: ${JSON.stringify(options)}`);
      Accounts.createUser(options, either(reject, originalError).or(resolve));
    }, [ options, gagarinOptions.verbose ]);
  },

  login: function (user, password) {
    let originalError = new Error();
    if(gagarinOptions.verbose)
      logs.client(`Login with user: ${user} password: ${password}`);

    return this.promise(function (resolve, reject, user, password, verbose) {
      if(verbose)
        console.log(`Login with user: ${user} password: ${password}`);
      Meteor.loginWithPassword(user, password, either(reject).or(resolve));
    }, [ user, password, gagarinOptions.verbose ]);
  },

  logout: function () {
    let originalError = new Error();
    if(gagarinOptions.verbose)
      logs.client(`Logout`);

    return this.promise(function (resolve, reject, verbose) {
      if(verbose)
        console.log(`Logout`);
      Meteor.logout(either(reject).or(resolve));
    }, [ gagarinOptions.verbose ]);
  },

  // TODO: allow igonring controller.ready() state
  waitForRoute: function (path, timeout) {
    if(gagarinOptions.verbose)
      logs.client(`Waiting for route: ${path} for ${timeout || DEFAULT_TIMEOUT}ms`);

    return this.execute(function (path, timeout, verbose) {
      if(verbose)
        console.log(`Waiting for route: ${path} for ${timeout}ms`);
      Router.go(path);
    }, [ path, timeout || DEFAULT_TIMEOUT, gagarinOptions.verbose ])
    .wait(timeout || DEFAULT_TIMEOUT, 'until current path is ' + path, function (path) {

      var controller = Router.current();
      var pathOK = (window.location.pathname + window.location.search + window.location.hash === path);

      if (controller && pathOK && controller.ready()) {
        return true;
      } else {
        Router.go(path);
      }
    }, [ path ]);
  },
  
  afterFlush: function () {
    if(gagarinOptions.verbose)
      logs.client(`Flushing tracker`);

    return this.promise(function (resolve, verbose) {
      if(verbose)
        console.log(`Flushing tracker`);
      Tracker.afterFlush(resolve);
    }, [ gagarinOptions.verbose ]);
  },

  disconnect: function () {
    if(gagarinOptions.verbose)
      logs.client(`DDP Meteor.disconnect`);

    return this.execute(function (verbose) {
      if(verbose)
        console.log(`DDP Meteor.disconnect`);
      Meteor.disconnect();
    }, [ gagarinOptions.verbose ]).wait(1000, 'until Meteor disconnects', function () {
      return !Meteor.status().connected;
    });
  },

  reconnect: function () {
    if(gagarinOptions.verbose)
      logs.client(`DDP Meteor.reconnect`);

    return this.execute(function (verbose) {
      if(verbose)
        console.log(`DDP Meteor.reconnect`);
      Meteor.reconnect();
    }, [ gagarinOptions.verbose ]).wait(1000, 'until Meteor reconnects', function () {
      return Meteor.status().connected;
    });
  },

  // LOGGING

  screenshot: function () {
    var screenshotsDir = path.join(process.env.CIRCLE_ARTIFACTS || '.', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir);
    }
    return this
      .saveScreenshot(path.join(screenshotsDir, (new Date()).toString() + '.png'))
      .then(function (filePath) {
        console.log('saved screenshot to file', filePath);
      });
  },

  // ASSERTIONS

  checkIfExist: function (selector) {
    return this.execute(function (selector) {
      return !!document.querySelector(selector);
    }, [ selector ]);
  },

  checkIfVisible: function (selector) {
    return this.execute(function (selector) {
      var element = document.querySelector(selector);
      if(!!element){
        return element.offsetWidth > 0 && element.offsetHeight > 0;
      }else{
        return false;
      }
    }, [ selector ]);
  },

  expectExist: function (selector) {
    return this.checkIfExist(selector).then(function (exist) {
      expect(exist).to.be.true;
    });
  },

  expectNotExist: function (selector) {
    return this.checkIfExist(selector).then(function (exist) {
      expect(exist).to.be.false;
    });
  },

  expectVisible: function (selector) {
    return this.checkIfVisible(selector).then(function (visible) {
      expect(visible).to.be.true;
    });
  },

  expectNotVisible: function (selector) {
    return this.checkIfVisible(selector).then(function (visible) {
      expect(visible).to.be.false;
    });
  },

  expectValueToEqual: function (selector, reference) {
    return this.getValue(selector).then(function (value) {
      expect(value).to.be.eql(reference);
    });
  },

  expectTextToEqual: function (selector, value) {
    return this.getText(selector).then(function (text) {
      expect(text).to.be.eql(value);
    });
  },

  expectTextToContain: function (selector, value) {
    return this.getText(selector).then(function (text) {
      expect(text).to.contain(value);
    });
  },

  expectToHaveClass: function (selector, value) {
    return this.getClass(selector).then(function (style) {
      expect(style).to.contain(value);
    });
  },

}
