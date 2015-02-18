
// server only!

if (!Meteor.settings.gagarin && process.env.GAGARIN_SETTINGS) {
  try {
    Meteor.settings.gagarin = JSON.parse(process.env.GAGARIN_SETTINGS);
  } catch (err) {
    console.warn('invalid Gagarin settings\n', err);
  }
}
