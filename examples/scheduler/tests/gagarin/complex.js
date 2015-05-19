describe('Complex.', function () {

    var db = mongo();

    var server1 = meteor({
        mongoUrl: db.getMongoUrl()
    });

    var server2 = meteor({
        mongoUrl: db.getMongoUrl()
    });

    var taskId = null;

    before(function () {
        return server1.execute(function () {
            return Tasks.schedule('a task', moment().add(1, 'second').toDate());
        }).then(function (value) {
            taskId = value;
        });
    });

    before(function () {
        return server1.wait(2000, 'until task is executed', function (taskId) {
            return !!Tasks.findOne({ _id: taskId, status: 'resolved' });
        }, [ taskId ]).sleep(100);
    });

    it('the task should only be executed once', function () {
        return server1.execute(function (taskId) {
            return Tasks.findOne({ _id: taskId });
        }, [ taskId ]).then(function (task) {
            expect(task.executedAt).to.have.length(1);
        });
    });

});
