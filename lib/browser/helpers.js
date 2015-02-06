var expect = require('chai').expect;
var either = require('../tools').either;
var Promise = require('es6-promise').Promise;

var DEFAULT_TIMEOUT = 5000;

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
    return this.wait(timeout || DEFAULT_TIMEOUT, 'until element ' + selector + ' is present', function (selector) {
      return !!document.querySelector(selector);
    }, [ selector ]);
  },

  waitUntilGone: function (selector, timeout) {
    return this.wait(timeout || DEFAULT_TIMEOUT, 'until element ' + selector + ' is gone', function (selector) {
      return !document.querySelector(selector);
    }, [ selector ]);
  },

  waitUntilNotVisible: function (selector, timeout) {
    return this.wait(timeout || DEFAULT_TIMEOUT, 'until element ' + selector + ' is hidden', function (selector) {
      var element = document.querySelector(selector);
      return !element || window.getComputedStyle(element).display === 'none';
    }, [ selector ]);
  },

  getText: function (selector) {
    return this.waitForDOM(selector).execute(function (selector) {
      var element = document.querySelector(selector);
      return element && element.innerHTML;
    }, [ selector ]);
  },

  //getText: function (selector) {
  //  return this.waitForDOM(selector).execute(function (selector) {
  //    return $(selector).text();
  //  }, selector);
  //},

  getValue: function (selector) {
    return this.waitForDOM(selector).execute(function (selector) {
      var element = document.querySelector(selector);
      return element && element.value;
    }, [ selector ]);
  },

  getClass: function (selector) {
    return this.waitForDOM(selector).execute(function (selector) {
      var element = document.querySelector(selector);
      return (element && element.className) || '';
    }, [ selector ]);
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
    return this.waitForDOM(selector).execute(function (selector, value) {
      var element = document.querySelector(selector);
      if (element) {
        element.value = value;
      }
    }, [ selector, value ]);
  },

  focus: function (selector) {
    return this.waitForDOM(selector).execute(function (selector) {
      var element = document.querySelector(selector);
      element && element.focus();
    }, [ selector ]);
  },
  
  blur: function (selector) {
    return this.waitForDOM(selector).execute(function (selector) {
      var element = document.querySelector(selector);
      element && element.blur();
    }, [ selector ]);
  },

  click: function (selector, keys) {
    return this.__custom__(function (operand, done) {
      operand.browser.elementByCssSelectorOrNull(selector, done);
    }).then(function (element) {
      if (!element) {
        throw new Error('element ' + selector + ' does not exists');
      }
      return new Promise(function (resolve, reject) {
        element.click(either(reject).or(resolve));
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
    return this.__custom__(function (operand, done) {
      operand.browser.elementByCssSelectorOrNull(selector, done);
    }).then(function (element) {
      if (!element) {
        throw new Error('element ' + selector + ' does not exists');
      }
      return new Promise(function (resolve, reject) {
        element.sendKeys(keys, either(reject).or(resolve));
      });
    });
  },

  signUp: function (options) {
    return this.promise(function (resolve, reject, options) {
      Accounts.createUser(options, either(reject).or(resolve));
    }, [ options ]);
  },

  login: function (user, password) {
    return this.promise(function (resolve, reject, user, password) {
      Meteor.loginWithPassword(user, password, either(reject).or(resolve));
    }, [ user, password ]);
  },

  logout: function () {
    return this.promise(function (resolve, reject) {
      Meteor.logout(either(reject).or(resolve));
    });
  },

  // TODO: allow igonring controller.ready() state
  waitForRoute: function (path, timeout) {
    return this.execute(function (path) {
      Router.go(path);
    }, [ path ])
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
    return this.promise(function (resolve) {
      Tracker.afterFlush(resolve);
    });
  },

  disconnect: function () {
    return this.execute(function () {
      Meteor.disconnect();
    }).wait(1000, 'unitl Meteor disconnects', function () {
      return !Meteor.status().connected;
    });
  },

  reconnect: function () {
    return this.execute(function () {
      Meteor.reconnect();
    }).wait(1000, 'unitl Meteor reconnects', function () {
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
      return !!element && window.getComputedStyle(element).display !== 'none';
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
