var Promise = require('es6-promise').Promise;

describe('MongoDB.', function () {

  var db = mongo({ dbName: 'gagarin' });

  describe('Simple database methods.', function () {
  
    var collection = db.collection('simple_methods');

    it('should be able to insert a document', function () {
      return collection
        .insert({ x: 1 })
        .findOne({ x: 1 })
        .then(function (data) {
          expect(data).to.have.property('x', 1);
        });
    });

    it('should be able to update a document', function () {
      return collection
        .update({ x: 1 }, { $inc: { x: 2 }})
        .findOne({ x: 3 })
        .then(function (data) {
          expect(data).to.have.property('x', 3);
        });
    });

    it('should be able to remove a document', function () {
      return collection
        .remove({ x: 3 })
        .findOne({ x: 3 })
        .then(function (data) {
          expect(data).to.be.null;
        });
    });

  });

  describe('Using cursor.', function () {

    var collection = db.collection('cursor_test');

    before(function () {
      return Promise.all([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (value) {
        return collection.insert({ x: value }, { w: 1 });
      }));
    });

    it('should be able to iterate over all documents', function () {
      var counter = 0;
      return collection.find()
        .each(function (data) {
          counter += data.x;
        }).then(function () {
          expect(counter).to.equal(45);
        });
    });

    it('should be able to access all data at once', function () {
      return collection.find({}).toArray().then(function (listOfItems) {
        expect(listOfItems.reduce(function (sum, data) { return sum + data.x; }, 0)).to.equal(45);
      });
    });

  });

  describe('Exceptions.', function () {
    
    var collection = db.collection('throwing errors');
    var cursor     = collection.find();

    it('should throw an error if methods are called with wrong arguments', function () {
      
      // TODO: add more test cases

      expect(function () {
        cursor.each();
      }).to.throw(/function/);

    });

    it('should throw an error if a collection method is called in a wrong context', function () {
      
      expect(function () {
        db.find();
      }).to.throw(/collection/);

      expect(function () {
        db.insert();
      }).to.throw(/collection/);

      expect(function () {
        db.update();
      }).to.throw(/collection/);

      expect(function () {
        db.remove();
      }).to.throw(/collection/);

      expect(function () {
        db.findOne();
      }).to.throw(/collection/);

    });

    it('should throw an error if a cursor method is called in a wrong context', function () {
      
      expect(function () {
        collection.limit();
      }).to.throw(/cursor/);

      expect(function () {
        collection.skip();
      }).to.throw(/cursor/);

      expect(function () {
        collection.sort();
      }).to.throw(/cursor/);

      expect(function () {
        collection.toArray();
      }).to.throw(/cursor/);

      expect(function () {
        collection.each();
      }).to.throw(/cursor/);

      expect(function () {
        collection.nextObject();
      }).to.throw(/cursor/);

    });


  });

});
