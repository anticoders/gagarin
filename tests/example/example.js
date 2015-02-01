Fiber = null;
Items = new Meteor.Collection('items');
reset = 0;

if (Meteor.isClient) {

  Session.set('counter', 0);

  Meteor.subscribe('items');


  Template.hello.helpers({
    greeting: function () {
      return "Welcome to example.";
    },
    counter: function () {
      return Session.get('counter');
    }
  });

  Template.hello.events({
    'click input': function () {
      Session.set('counter', Session.get('counter') + 1);
    },
    'click #waitForDOM' : function() {
      var waitForTestDiv = document.createElement('div');
      waitForTestDiv.id = 'waitForTestDiv';
      waitForTestDiv.innerHTML = 'I have been added.';
      document.body.appendChild(waitForTestDiv);
    },
    'click #waitUntilGone' : function() {
      var parent = document.getElementById('waitUntilGone');
      var child = document.getElementById('removeChildTestDiv');
      parent.removeChild(child);
    },
    'click #waitUntilNotVisible' : function() {
      var div = document.getElementById('waitUntilNotVisible');
      div.style.display = "none";
    },
    'focus #focus' : function() {
      document.getElementById('focus').value = 'Focused.';
    },
    'blur #blur' : function() {
      document.getElementById('blur').value = 'Blurred.';
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
