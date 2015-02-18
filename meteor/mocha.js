
var reports = new Mongo.Collection("gagarin_reports");

if (Meteor.isServer) {
  Meteor.publish('/gagarin/reports', function () {
    return reports.find({});
  });
}

var when = 0;

Gagarin.report = Meteor.bindEnvironment(function report (what, data) {
  reports.insert(_.extend({ what: what, when: when++ }, data));
});
