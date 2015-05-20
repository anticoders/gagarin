
var time = new ReactiveVar(Date.now());

Meteor.setInterval(function () {
    time.set(Date.now());
}, 100);

Template.body.helpers({
    tasks: function (status) {
        return Tasks.find({ status: status });
    },
    secondsLeft: function () {
        return Math.floor((this.scheduledFor.getTime() - time.get()) / 1000);
    },
});

Template.body.events({
    'submit form': function (e, t) {
        e.preventDefault();

        var title = t.$('[name=title]').val();
        var delay = t.$('[name=delay]').val();

        delay = parseInt(delay, 10);

        Tasks.schedule(title, moment().add(delay, 'seconds').toDate());
    },
    'click [data-action=remove]': function () {
        Tasks.remove({ _id: this._id });
    },
});
