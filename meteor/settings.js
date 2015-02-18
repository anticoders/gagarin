
if (!Meteor.settings.gagarin && process.env.GAGARIN_SETTINGS) {
  try {
    Meteor.settings.gagarin = JSON.parse(process.env.GAGARIN_SETTINGS);
  } catch (err) {
    console.warn('invalid Gagarin settings\n', err);
  }
}

var settings = Meteor.settings.gagarin;

if (Package['anti:gagarin']) { // it might get created by a fixture
  Gagarin = Package['anti:gagarin'].Gagarin;
} else {
  Gagarin = {};
}

Gagarin.isActive = !!settings;

if (Gagarin.isActive) {
  Gagarin.settings = settings;
}

Meteor.startup(function () {

  if (!Gagarin.isActive) {
    return;
  }

  maybeCreateUser(settings);
});

Meteor.startup(function () {

  if (!Gagarin.isActive) {
    return;
  }

  maybeCreateUser(settings);
});

function maybeCreateUser (settings) {

  var userId = null;

  if (!Package['accounts-password']) {
    return;
  }

  if (!settings.username || !settings.password) {
    return;
  }

  Meteor.users.remove({ username: settings.username });

  userId = Accounts.createUser({
    username : settings.username,
    password : settings.password,
  });

  Meteor.users.update({_id: userId}, { $set: {
    gagarin : true
  }});

}


