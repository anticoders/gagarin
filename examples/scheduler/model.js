
Tasks = new Mongo.Collection('tasks');

Tasks.validate = schema({

    title        : String,
    status       : String,
    createdAt    : Date,
    scheduledFor : Date,
    executedAt   : Array.of(Date)
});

Archive = new Mongo.Collection('archive');

/**
 * Schedule task for the given date.
 *
 * @param {string} title
 * @param {date} forDate
 */
Tasks.schedule = function schedule (title, forDate) {

    return Tasks.insert({

        title        : title,
        status       : 'scheduled',
        createdAt    : moment().toDate(),
        scheduledFor : forDate,
    });
}

/**
 * Set the status of the corresponding task to "resolved".
 *
 * @param {string} id
 * @param {object} fields
 * @param {date} fields.scheduledFor
 */
Tasks.trigger = function trigger (id, fields) {
    "use strict";

    var delay = fields.scheduledFor.getTime() - Date.now();

    Meteor.setTimeout(Meteor.bindEnvironment(function () {

        console.log('executing task "' + fields.title + '"');

        Tasks.update({ _id: id }, {
            $set  : { status: 'in progress' },
            $push : { executedAt: moment().toDate() },
        });

        Meteor.setTimeout(Meteor.bindEnvironment(function () {
            Tasks.update({ _id: id }, {
                $set: { status: 'resolved' }
            });
        }), 1000);

    }), delay);
}
