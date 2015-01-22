describe('MongoDB.', function () {

  var db    = mongo({ dbName: 'gagarin' });
  var items = db.collection('items');

  it('should just work', function () {
    return items
      .insert({ a: 1 })
      .update({ a: 1 }, { $inc: { a: 2 }})
      .findOne()
      .then(function (data) {
        console.log(data);
      })
  });

});
