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
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
