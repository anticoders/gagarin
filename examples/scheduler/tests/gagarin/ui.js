describe('User Interface.', function () {

    var server = meteor();

    var client = browser({
        location: server.getRootUrl()
    });

    before(function () {
        return client
            .setValue('[name=title]', 'task1')
            .setValue('[name=delay]', '2')
            .click('[type=submit]');
    });

    it('schould add a new task to the schedule', function () {
        return client.wait(1000, 'until the new task is visible', function () {
            var element = $('[data-status=scheduled] :contains(task1)')[0];
            return element && Blaze.getElementData(element);
        }).then(function (data) {
            expect(data.title).to.equal('task1');
            expect(data.status).to.equal('scheduled');
        });
    });

    it('schould eventually move task to the last collumn', function () {
        return client.wait(3000, 'until the moves to the last column', function () {
            var element = $('[data-status=resolved] :contains(task1)')[0];
            return element && Blaze.getElementData(element);
        }).then(function (data) {
            expect(data.title).to.equal('task1');
            expect(data.status).to.equal('resolved');
        });
    });

});
