describe('Basic.', function () {

    var server = meteor();
    var taskId = null;

    before(function () {
        return server.execute(function () {
            return Tasks.schedule('a task', moment().add(1, 'second').toDate());
        }).then(function (value) {
            taskId = value;
        });
    });

    it('should be ok', function () {
        expect(taskId).to.be.ok;
    });

    it('should insert task into database', function () {
        return server.execute(function (taskId) {
            return Tasks.findOne({ _id: taskId });
        }, [ taskId ]).then(function (task) {
            expect(task).to.be.ok;
            expect(task.title).to.equal('a task');
        });
    });

    it('a worker should claim the task', function () {
        return server.wait(100, 'until task is claimed', function (taskId) {
            return !!Tasks.findOne({ _id: taskId, claimedBy: { $ne: null } });
        }, [ taskId ]);
    });

    it('should execute the task eventually', function () {
        return server.wait(2000, 'until task is executed', function (taskId) {
            return !!Tasks.findOne({ _id: taskId, status: 'resolved' });
        }, [ taskId ]);
    });

    it('the time of execution should be accurate', function () {
        return server.execute(function (taskId) {
            return Tasks.findOne({ _id: taskId });
        }, [ taskId ]).then(function (task) {
            var diff = task.executedAt[0].getTime() - task.scheduledFor.getTime();
            expect(Math.abs(diff)).to.be.at.most(10);
        });
    });

});
