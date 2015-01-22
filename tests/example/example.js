Items = new Meteor.Collection('items');
reset = 0;

if (Meteor.isClient) {

  Session.set('counter', 0);

  Template.hello.greeting = function () {
    return "Welcome to example.";
  };

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
    reset += 1;
  });

}

if (Meteor.isServer) {

  console.log('settings are:', Meteor.settings);

  Meteor.startup(function () {
    // code to run on server at startup
  });

  Meteor.publish('items', function () {
    console.log('subscribing');
    return Items.find();
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
      Items.insert({ name: name });
    },
  });
}
