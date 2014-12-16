
var settings;

Gagarin = {};

if (process.env.GAGARIN_SETTINGS) {
  try {
    settings = JSON.parse(process.env.GAGARIN_SETTINGS);
  } catch (err) {
    console.warn('invalid Gagarin settings\n', err);
  }
}

settings = settings || Meteor.settings.gagarin;

Gagarin.isActive = !!settings;

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


