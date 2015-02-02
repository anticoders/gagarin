Fiber = null;
Items = new Meteor.Collection('items');
reset = 0;

if (Meteor.isClient) {

  Session.set('counter', 0);

  Meteor.subscribe('items');

  Template.hello.helpers({
    greeting: function () {
      return "Welcome to example.";
    }
  });

  Template.hello.helpers({
    counter: function () {
      return Session.get('counter');
    }
  });

  Template.hello.events({
    'click input': function () {
      Session.set('counter', Session.get('counter') + 1);
    }
  });

  Meteor.connection._stream.on('reset', function () {
    // console.warn('connection reset detected');
    reset += 1;
  });

  Meteor.startup(function () {
    console.warn('application started');
  });

  Tracker.autorun(function () {
    // console.warn(JSON.stringify(Meteor.connection.status()));
  });

}

if (Meteor.isServer) {

  Fiber = Npm.require('fibers');

  console.log('settings are:', Meteor.settings);

  Meteor.startup(function () {
    // code to run on server at startup
  });

  Meteor.publish('items', function () {
    console.log('subscribing');
    return Items.find();
  });

  Meteor.publish('denied', function () {
    throw new Meteor.Error(403, 'Access denied.');
  });

  Meteor.publish('nothing', function () {
  });

  Meteor.methods({
    'example': function () {
      console.log('example method called');
      return Meteor.release;
    },
    'private': function () {
      if (!this.userId) {
        throw new Meteor.Error('403', 'Access denied');
      }
      return this.userId;
    },
    'create': function (name) {
      var fiber = Fiber.current;
      // delay this method for better testing insight
      Meteor.setTimeout(function () {
        fiber.run();
      }, 1000);
      Fiber.yield();
      //---------------------------
      Items.insert({ name: name });
    },
  });
}
