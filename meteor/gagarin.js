
var settings = Meteor.settings && Meteor.settings.gagarin;

if (Package['anti:gagarin']) { // it might get created by a fixture
  Gagarin = Package['anti:gagarin'].Gagarin;
} else {
  Gagarin = {};
}

Gagarin.isActive = !!settings;

if (Gagarin.isActive) {
  Gagarin.settings = settings;
}
