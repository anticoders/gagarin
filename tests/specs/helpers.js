var Promise = require('es6-promise').Promise;

describe('Helpers', function () {

  describe('Built in DOM helpers', function () {

    var server = meteor();
    var client = browser(server);

    it('should be able to use sendKeys', function () {
      return client
        .sendKeys('input[type=text]', 'abc')
        .expectValueToEqual('input[type=text]', 'abc');
    });

    it('should be able to use click', function () {
      return client
        .click('input[type=button]')
        .expectTextToContain('p', '1');
    });

    it('waitForDOM should return true when dom object has been added', function () {
      return client
        .click('#waitForDOM')
        .waitForDOM('#waitForTestDiv')
        .then(function(res) {
          expect(res).to.be.true;
        });
    });

    it('waitUntilGone should return true when dom object has been removed', function () {
      return client
        .click('#waitUntilGone')
        .waitUntilGone('#removeChildTestDiv')
        .then(function(res) {
          expect(res).to.be.true;
        });
    });

    it('waitUntilNotVisible should return true when dom object is no longer visible', function () {
      return client
        .click('#waitUntilNotVisible')
        .waitUntilNotVisible('#waitUntilNotVisible')
        .then(function(res) {
          expect(res).to.be.true;
        });
    });

    it('getText should return innerHTML for a given selector', function () {
      return client
        .getText('#getText')
        .then(function(res) {
          expect(res).to.be.eql('<h3>Get text.</h3>');
        });
    });

    it('getValue should return the value for a given selector', function () {
      return client
        .getValue('#getValue')
        .then(function(res) {
          expect(res).to.be.eql('Get value.');
        });
    });

    it('getClass should return the classname for a given selector', function () {
      return client
        .getClass('#getClass')
        .then(function(res) {
          expect(res).to.be.eql('myClass');
        });
    });

    it('getClass should return empty string if selector has no class', function () {
      return client
        .getClass('#noClass')
        .then(function(res) {
          expect(res).to.be.eql('');
        });
    });

    it('setValue should set the value of an input', function () {
      return client
        .setValue('#setValue','test value')
        .getValue('#setValue')
        .then(function(res) {
          expect(res).to.be.eql('test value');
        });
    });

    it('focus should set focus on the given selector', function () {
      return client
        .focus('#focus')
        .wait(1000,'until focused',function(el){
          var element = document.querySelector('#focus');
          return element.value==='Focused.';
        })
        .then(function(res) {
          expect(res).to.be.true;
        });
    });

    it('blur should set blur on the given selector', function () {
      return client
        .focus('#blur')
        .blur('#blur')
        .wait(1000,'until blurred',function(el){
          var element = document.querySelector('#blur');
          return element.value==='Blurred.';
        })
        .then(function(res) {
          expect(res).to.be.true;
        });
    });

  });
  
  describe('Built in Accounts helpers', function () {
    
    var server = meteor();
    var client = browser(server);

    before(function () {
      return server.execute(function () {
        Accounts.createUser({email: 'existingUser@example.com',password: 'password'});
      })    
    });

    it('signUp should create a new user with email option', function () {
      return client
        .signUp({email: 'test@example.com',password: 'password'})
        .execute(function () {
          return Meteor.users.findOne({'emails.address': 'test@example.com'});
        })
        .then(function(res) {
          var email = res.emails[0].address;
          expect(email).to.eql('test@example.com');
        });
    });

    it('signUp should create a new user with username option', function () {
      return client
        .signUp({username: 'testName',password: 'password'})
        .execute(function () {
          return Meteor.users.findOne({username: 'testName'});
        })
        .then(function(res) {
          expect(res.username).to.eql('testName');
        });
    });

    it('login should login existing user', function () {
      return client
        .login('existingUser@example.com','password')
        .execute(function () {
          return Meteor.user();
        })
        .then(function(res) {
          var email = res.emails[0].address;
          expect(email).to.eql('existingUser@example.com');
        });
    });

    it('logout should logout logged in user', function () {
      return client
        .logout()
        .execute(function () {
          return Meteor.user();
        })
        .then(function(res) {
          expect(res).to.be.null;
        });
    });


  });

  // TODO test afterFlush
  describe.skip('Built in Tracker helpers', function () {
    var server = meteor();
    var client = browser(server);
    it('afterFlush should schedule function for next flush', function () {
      return client
        .afterFlush()
    });
  });  

  describe('Built in server connections helpers', function () {
    var server = meteor();
    var client = browser(server);
    
    it('should start in connected state.', function () {
      return client
        .execute(function () {
          return Meteor.status();
        })
        .then(function(res) {
          expect(res.status).to.eql('connected');
          expect(res.connected).to.be.true;
        })
    });

    it('disconnect client from the server.', function () {
      return client
        .disconnect()
        .execute(function () {
          return Meteor.status();
        })
        .then(function(res) {
          expect(res.connected).to.be.false;
        })
    });

    it('reconnect client to the server.', function () {
      return client
        .reconnect()
        .execute(function () {
          return Meteor.status();
        })
        .then(function(res) {
          expect(res.status).to.eql('connected');
          expect(res.connected).to.be.true;
        })
    });

  }); 

  //TODO where to put screenshot file for this test ? 
  describe.skip('screenshot', function () {
    var server = meteor();
    var client = browser(server);

    it('should save a screenshot to file.', function () {
      return client
        .screenshot()
        .then(function(res) {
          //assert file exists and is named by today's date and has some bytes
        })
    });
  });

  describe('helper assertions', function () {
    var server = meteor();
    var client = browser(server);

    describe('checkIfExist', function () {
      it('should return true if element exists', function () {
        return client
          .checkIfExist('#visibleElement')
          .then(function(res) {
            expect(res).to.be.true;
          })
      });

      it('should return false if element does not exist', function () {
        return client
          .checkIfExist('#noExist')
          .then(function(res) {
            expect(res).to.be.false;
          })
      });
    });

    describe('checkIfVisible ', function () {
      it('should return true if element is visible', function () {
        return client
          .checkIfVisible('#visibleElement')
          .then(function(res) {
            expect(res).to.be.true;
          })
      });

      it('should return true if element and ancestors are visible', function () {
        return client
          .checkIfVisible('#visibleChild')
          .then(function(res) {
            expect(res).to.be.true;
          })
      });

      it('should return false if element does not exist', function () {
        return client
          .checkIfVisible('#noExist')
          .then(function(res) {
            expect(res).to.be.false;
          })
      });

      it('should return false if element is not visible', function () {
        return client
          .checkIfVisible('#hiddenElement')
          .then(function(res) {
            expect(res).to.be.false;
          })
      });

      it('should return false if any ancestors are not visible', function () {
        return client
          .checkIfVisible('#hiddenChild')
          .then(function(res) {
            expect(res).to.be.false;
          })
      });
    });
  });

  describe('Custom user-defined helpers', function () {

    var server = meteor({
      helpers: {
        sleepForOneSecond: function () {
          return this.then(function () {
            return new Promise(function (resolve) {
              setTimeout(resolve, 1000);
            });
          });
        },
      },
    });

    it('should be able to use a custom helper', function () {
      return server.sleepForOneSecond();
    });

  });

});
