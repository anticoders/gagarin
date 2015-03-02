
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
