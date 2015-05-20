
var WATCH_INTERVAL = 5000;
var handle = null;
var uniqueId = Random.id();

Meteor.startup(function () {

    watch();

    Meteor.setInterval(watch, WATCH_INTERVAL);

    Tasks.find({
        claimedBy : uniqueId,
        status    : 'claimed',

    }).observeChanges({
        added: Tasks.trigger
    });
});

/**
 * Reset the current observer to see the upcomming time-window.
 */
function watch () {
    "use strict";

    if (handle) {
        handle.stop();
    }

    handle = Tasks.find({
        scheduledFor : { $lte: moment().add(WATCH_INTERVAL, 'ms').toDate() },
        status       : 'scheduled',

    }).observeChanges({
        added: function (id) {
            // try to claim this task

            console.log('server observed task', id);

            Tasks.update({ _id: id, claimedBy: null }, {
              $set: {
                claimedBy : uniqueId,
                status    : 'claimed'
              }
            });
        }
    });
}
