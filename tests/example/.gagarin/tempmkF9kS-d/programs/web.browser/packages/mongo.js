//////////////////////////////////////////////////////////////////////////
//                                                                      //
// This is a generated file. You can view the original                  //
// source in your browser if your browser supports source maps.         //
//                                                                      //
// If you are using Chrome, open the Developer Tools and click the gear //
// icon in its lower right corner. In the General Settings panel, turn  //
// on 'Enable source maps'.                                             //
//                                                                      //
// If you are using Firefox 23, go to `about:config` and set the        //
// `devtools.debugger.source-maps-enabled` preference to true.          //
// (The preference should be on by default in Firefox 24; versions      //
// older than 23 do not support source maps.)                           //
//                                                                      //
//////////////////////////////////////////////////////////////////////////


(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var Random = Package.random.Random;
var EJSON = Package.ejson.EJSON;
var JSON = Package.json.JSON;
var _ = Package.underscore._;
var LocalCollection = Package.minimongo.LocalCollection;
var Minimongo = Package.minimongo.Minimongo;
var Log = Package.logging.Log;
var DDP = Package.ddp.DDP;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var check = Package.check.check;
var Match = Package.check.Match;

/* Package-scope variables */
var Mongo, LocalCollectionDriver;

(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mongo/local_collection_driver.js                                                                          //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
LocalCollectionDriver = function () {                                                                                 // 1
  var self = this;                                                                                                    // 2
  self.noConnCollections = {};                                                                                        // 3
};                                                                                                                    // 4
                                                                                                                      // 5
var ensureCollection = function (name, collections) {                                                                 // 6
  if (!(name in collections))                                                                                         // 7
    collections[name] = new LocalCollection(name);                                                                    // 8
  return collections[name];                                                                                           // 9
};                                                                                                                    // 10
                                                                                                                      // 11
_.extend(LocalCollectionDriver.prototype, {                                                                           // 12
  open: function (name, conn) {                                                                                       // 13
    var self = this;                                                                                                  // 14
    if (!name)                                                                                                        // 15
      return new LocalCollection;                                                                                     // 16
    if (! conn) {                                                                                                     // 17
      return ensureCollection(name, self.noConnCollections);                                                          // 18
    }                                                                                                                 // 19
    if (! conn._mongo_livedata_collections)                                                                           // 20
      conn._mongo_livedata_collections = {};                                                                          // 21
    // XXX is there a way to keep track of a connection's collections without                                         // 22
    // dangling it off the connection object?                                                                         // 23
    return ensureCollection(name, conn._mongo_livedata_collections);                                                  // 24
  }                                                                                                                   // 25
});                                                                                                                   // 26
                                                                                                                      // 27
// singleton                                                                                                          // 28
LocalCollectionDriver = new LocalCollectionDriver;                                                                    // 29
                                                                                                                      // 30
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/mongo/collection.js                                                                                       //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
// options.connection, if given, is a LivedataClient or LivedataServer                                                // 1
// XXX presently there is no way to destroy/clean up a Collection                                                     // 2
                                                                                                                      // 3
/**                                                                                                                   // 4
 * @summary Namespace for MongoDB-related items                                                                       // 5
 * @namespace                                                                                                         // 6
 */                                                                                                                   // 7
Mongo = {};                                                                                                           // 8
                                                                                                                      // 9
/**                                                                                                                   // 10
 * @summary Constructor for a Collection                                                                              // 11
 * @locus Anywhere                                                                                                    // 12
 * @instancename collection                                                                                           // 13
 * @class                                                                                                             // 14
 * @param {String} name The name of the collection.  If null, creates an unmanaged (unsynchronized) local collection. // 15
 * @param {Object} [options]                                                                                          // 16
 * @param {Object} options.connection The server connection that will manage this collection. Uses the default connection if not specified.  Pass the return value of calling [`DDP.connect`](#ddp_connect) to specify a different server. Pass `null` to specify no connection. Unmanaged (`name` is null) collections cannot specify a connection.
 * @param {String} options.idGeneration The method of generating the `_id` fields of new documents in this collection.  Possible values:
                                                                                                                      // 19
 - **`'STRING'`**: random strings                                                                                     // 20
 - **`'MONGO'`**:  random [`Mongo.ObjectID`](#mongo_object_id) values                                                 // 21
                                                                                                                      // 22
The default id generation technique is `'STRING'`.                                                                    // 23
 * @param {Function} options.transform An optional transformation function. Documents will be passed through this function before being returned from `fetch` or `findOne`, and before being passed to callbacks of `observe`, `map`, `forEach`, `allow`, and `deny`. Transforms are *not* applied for the callbacks of `observeChanges` or to cursors returned from publish functions.
 */                                                                                                                   // 25
Mongo.Collection = function (name, options) {                                                                         // 26
  var self = this;                                                                                                    // 27
  if (! (self instanceof Mongo.Collection))                                                                           // 28
    throw new Error('use "new" to construct a Mongo.Collection');                                                     // 29
                                                                                                                      // 30
  if (!name && (name !== null)) {                                                                                     // 31
    Meteor._debug("Warning: creating anonymous collection. It will not be " +                                         // 32
                  "saved or synchronized over the network. (Pass null for " +                                         // 33
                  "the collection name to turn off this warning.)");                                                  // 34
    name = null;                                                                                                      // 35
  }                                                                                                                   // 36
                                                                                                                      // 37
  if (name !== null && typeof name !== "string") {                                                                    // 38
    throw new Error(                                                                                                  // 39
      "First argument to new Mongo.Collection must be a string or null");                                             // 40
  }                                                                                                                   // 41
                                                                                                                      // 42
  if (options && options.methods) {                                                                                   // 43
    // Backwards compatibility hack with original signature (which passed                                             // 44
    // "connection" directly instead of in options. (Connections must have a "methods"                                // 45
    // method.)                                                                                                       // 46
    // XXX remove before 1.0                                                                                          // 47
    options = {connection: options};                                                                                  // 48
  }                                                                                                                   // 49
  // Backwards compatibility: "connection" used to be called "manager".                                               // 50
  if (options && options.manager && !options.connection) {                                                            // 51
    options.connection = options.manager;                                                                             // 52
  }                                                                                                                   // 53
  options = _.extend({                                                                                                // 54
    connection: undefined,                                                                                            // 55
    idGeneration: 'STRING',                                                                                           // 56
    transform: null,                                                                                                  // 57
    _driver: undefined,                                                                                               // 58
    _preventAutopublish: false                                                                                        // 59
  }, options);                                                                                                        // 60
                                                                                                                      // 61
  switch (options.idGeneration) {                                                                                     // 62
  case 'MONGO':                                                                                                       // 63
    self._makeNewID = function () {                                                                                   // 64
      var src = name ? DDP.randomStream('/collection/' + name) : Random;                                              // 65
      return new Mongo.ObjectID(src.hexString(24));                                                                   // 66
    };                                                                                                                // 67
    break;                                                                                                            // 68
  case 'STRING':                                                                                                      // 69
  default:                                                                                                            // 70
    self._makeNewID = function () {                                                                                   // 71
      var src = name ? DDP.randomStream('/collection/' + name) : Random;                                              // 72
      return src.id();                                                                                                // 73
    };                                                                                                                // 74
    break;                                                                                                            // 75
  }                                                                                                                   // 76
                                                                                                                      // 77
  self._transform = LocalCollection.wrapTransform(options.transform);                                                 // 78
                                                                                                                      // 79
  if (! name || options.connection === null)                                                                          // 80
    // note: nameless collections never have a connection                                                             // 81
    self._connection = null;                                                                                          // 82
  else if (options.connection)                                                                                        // 83
    self._connection = options.connection;                                                                            // 84
  else if (Meteor.isClient)                                                                                           // 85
    self._connection = Meteor.connection;                                                                             // 86
  else                                                                                                                // 87
    self._connection = Meteor.server;                                                                                 // 88
                                                                                                                      // 89
  if (!options._driver) {                                                                                             // 90
    // XXX This check assumes that webapp is loaded so that Meteor.server !==                                         // 91
    // null. We should fully support the case of "want to use a Mongo-backed                                          // 92
    // collection from Node code without webapp", but we don't yet.                                                   // 93
    // #MeteorServerNull                                                                                              // 94
    if (name && self._connection === Meteor.server &&                                                                 // 95
        typeof MongoInternals !== "undefined" &&                                                                      // 96
        MongoInternals.defaultRemoteCollectionDriver) {                                                               // 97
      options._driver = MongoInternals.defaultRemoteCollectionDriver();                                               // 98
    } else {                                                                                                          // 99
      options._driver = LocalCollectionDriver;                                                                        // 100
    }                                                                                                                 // 101
  }                                                                                                                   // 102
                                                                                                                      // 103
  self._collection = options._driver.open(name, self._connection);                                                    // 104
  self._name = name;                                                                                                  // 105
                                                                                                                      // 106
  if (self._connection && self._connection.registerStore) {                                                           // 107
    // OK, we're going to be a slave, replicating some remote                                                         // 108
    // database, except possibly with some temporary divergence while                                                 // 109
    // we have unacknowledged RPC's.                                                                                  // 110
    var ok = self._connection.registerStore(name, {                                                                   // 111
      // Called at the beginning of a batch of updates. batchSize is the number                                       // 112
      // of update calls to expect.                                                                                   // 113
      //                                                                                                              // 114
      // XXX This interface is pretty janky. reset probably ought to go back to                                       // 115
      // being its own function, and callers shouldn't have to calculate                                              // 116
      // batchSize. The optimization of not calling pause/remove should be                                            // 117
      // delayed until later: the first call to update() should buffer its                                            // 118
      // message, and then we can either directly apply it at endUpdate time if                                       // 119
      // it was the only update, or do pauseObservers/apply/apply at the next                                         // 120
      // update() if there's another one.                                                                             // 121
      beginUpdate: function (batchSize, reset) {                                                                      // 122
        // pause observers so users don't see flicker when updating several                                           // 123
        // objects at once (including the post-reconnect reset-and-reapply                                            // 124
        // stage), and so that a re-sorting of a query can take advantage of the                                      // 125
        // full _diffQuery moved calculation instead of applying change one at a                                      // 126
        // time.                                                                                                      // 127
        if (batchSize > 1 || reset)                                                                                   // 128
          self._collection.pauseObservers();                                                                          // 129
                                                                                                                      // 130
        if (reset)                                                                                                    // 131
          self._collection.remove({});                                                                                // 132
      },                                                                                                              // 133
                                                                                                                      // 134
      // Apply an update.                                                                                             // 135
      // XXX better specify this interface (not in terms of a wire message)?                                          // 136
      update: function (msg) {                                                                                        // 137
        var mongoId = LocalCollection._idParse(msg.id);                                                               // 138
        var doc = self._collection.findOne(mongoId);                                                                  // 139
                                                                                                                      // 140
        // Is this a "replace the whole doc" message coming from the quiescence                                       // 141
        // of method writes to an object? (Note that 'undefined' is a valid                                           // 142
        // value meaning "remove it".)                                                                                // 143
        if (msg.msg === 'replace') {                                                                                  // 144
          var replace = msg.replace;                                                                                  // 145
          if (!replace) {                                                                                             // 146
            if (doc)                                                                                                  // 147
              self._collection.remove(mongoId);                                                                       // 148
          } else if (!doc) {                                                                                          // 149
            self._collection.insert(replace);                                                                         // 150
          } else {                                                                                                    // 151
            // XXX check that replace has no $ ops                                                                    // 152
            self._collection.update(mongoId, replace);                                                                // 153
          }                                                                                                           // 154
          return;                                                                                                     // 155
        } else if (msg.msg === 'added') {                                                                             // 156
          if (doc) {                                                                                                  // 157
            throw new Error("Expected not to find a document already present for an add");                            // 158
          }                                                                                                           // 159
          self._collection.insert(_.extend({_id: mongoId}, msg.fields));                                              // 160
        } else if (msg.msg === 'removed') {                                                                           // 161
          if (!doc)                                                                                                   // 162
            throw new Error("Expected to find a document already present for removed");                               // 163
          self._collection.remove(mongoId);                                                                           // 164
        } else if (msg.msg === 'changed') {                                                                           // 165
          if (!doc)                                                                                                   // 166
            throw new Error("Expected to find a document to change");                                                 // 167
          if (!_.isEmpty(msg.fields)) {                                                                               // 168
            var modifier = {};                                                                                        // 169
            _.each(msg.fields, function (value, key) {                                                                // 170
              if (value === undefined) {                                                                              // 171
                if (!modifier.$unset)                                                                                 // 172
                  modifier.$unset = {};                                                                               // 173
                modifier.$unset[key] = 1;                                                                             // 174
              } else {                                                                                                // 175
                if (!modifier.$set)                                                                                   // 176
                  modifier.$set = {};                                                                                 // 177
                modifier.$set[key] = value;                                                                           // 178
              }                                                                                                       // 179
            });                                                                                                       // 180
            self._collection.update(mongoId, modifier);                                                               // 181
          }                                                                                                           // 182
        } else {                                                                                                      // 183
          throw new Error("I don't know how to deal with this message");                                              // 184
        }                                                                                                             // 185
                                                                                                                      // 186
      },                                                                                                              // 187
                                                                                                                      // 188
      // Called at the end of a batch of updates.                                                                     // 189
      endUpdate: function () {                                                                                        // 190
        self._collection.resumeObservers();                                                                           // 191
      },                                                                                                              // 192
                                                                                                                      // 193
      // Called around method stub invocations to capture the original versions                                       // 194
      // of modified documents.                                                                                       // 195
      saveOriginals: function () {                                                                                    // 196
        self._collection.saveOriginals();                                                                             // 197
      },                                                                                                              // 198
      retrieveOriginals: function () {                                                                                // 199
        return self._collection.retrieveOriginals();                                                                  // 200
      }                                                                                                               // 201
    });                                                                                                               // 202
                                                                                                                      // 203
    if (!ok)                                                                                                          // 204
      throw new Error("There is already a collection named '" + name + "'");                                          // 205
  }                                                                                                                   // 206
                                                                                                                      // 207
  self._defineMutationMethods();                                                                                      // 208
                                                                                                                      // 209
  // autopublish                                                                                                      // 210
  if (Package.autopublish && !options._preventAutopublish && self._connection                                         // 211
      && self._connection.publish) {                                                                                  // 212
    self._connection.publish(null, function () {                                                                      // 213
      return self.find();                                                                                             // 214
    }, {is_auto: true});                                                                                              // 215
  }                                                                                                                   // 216
};                                                                                                                    // 217
                                                                                                                      // 218
///                                                                                                                   // 219
/// Main collection API                                                                                               // 220
///                                                                                                                   // 221
                                                                                                                      // 222
                                                                                                                      // 223
_.extend(Mongo.Collection.prototype, {                                                                                // 224
                                                                                                                      // 225
  _getFindSelector: function (args) {                                                                                 // 226
    if (args.length == 0)                                                                                             // 227
      return {};                                                                                                      // 228
    else                                                                                                              // 229
      return args[0];                                                                                                 // 230
  },                                                                                                                  // 231
                                                                                                                      // 232
  _getFindOptions: function (args) {                                                                                  // 233
    var self = this;                                                                                                  // 234
    if (args.length < 2) {                                                                                            // 235
      return { transform: self._transform };                                                                          // 236
    } else {                                                                                                          // 237
      check(args[1], Match.Optional(Match.ObjectIncluding({                                                           // 238
        fields: Match.Optional(Match.OneOf(Object, undefined)),                                                       // 239
        sort: Match.Optional(Match.OneOf(Object, Array, undefined)),                                                  // 240
        limit: Match.Optional(Match.OneOf(Number, undefined)),                                                        // 241
        skip: Match.Optional(Match.OneOf(Number, undefined))                                                          // 242
     })));                                                                                                            // 243
                                                                                                                      // 244
      return _.extend({                                                                                               // 245
        transform: self._transform                                                                                    // 246
      }, args[1]);                                                                                                    // 247
    }                                                                                                                 // 248
  },                                                                                                                  // 249
                                                                                                                      // 250
  /**                                                                                                                 // 251
   * @summary Find the documents in a collection that match the selector.                                             // 252
   * @locus Anywhere                                                                                                  // 253
   * @method find                                                                                                     // 254
   * @memberOf Mongo.Collection                                                                                       // 255
   * @instance                                                                                                        // 256
   * @param {MongoSelector} [selector] A query describing the documents to find                                       // 257
   * @param {Object} [options]                                                                                        // 258
   * @param {MongoSortSpecifier} options.sort Sort order (default: natural order)                                     // 259
   * @param {Number} options.skip Number of results to skip at the beginning                                          // 260
   * @param {Number} options.limit Maximum number of results to return                                                // 261
   * @param {MongoFieldSpecifier} options.fields Dictionary of fields to return or exclude.                           // 262
   * @param {Boolean} options.reactive (Client only) Default `true`; pass `false` to disable reactivity               // 263
   * @param {Function} options.transform Overrides `transform` on the  [`Collection`](#collections) for this cursor.  Pass `null` to disable transformation.
   * @returns {Mongo.Cursor}                                                                                          // 265
   */                                                                                                                 // 266
  find: function (/* selector, options */) {                                                                          // 267
    // Collection.find() (return all docs) behaves differently                                                        // 268
    // from Collection.find(undefined) (return 0 docs).  so be                                                        // 269
    // careful about the length of arguments.                                                                         // 270
    var self = this;                                                                                                  // 271
    var argArray = _.toArray(arguments);                                                                              // 272
    return self._collection.find(self._getFindSelector(argArray),                                                     // 273
                                 self._getFindOptions(argArray));                                                     // 274
  },                                                                                                                  // 275
                                                                                                                      // 276
  /**                                                                                                                 // 277
   * @summary Finds the first document that matches the selector, as ordered by sort and skip options.                // 278
   * @locus Anywhere                                                                                                  // 279
   * @method findOne                                                                                                  // 280
   * @memberOf Mongo.Collection                                                                                       // 281
   * @instance                                                                                                        // 282
   * @param {MongoSelector} [selector] A query describing the documents to find                                       // 283
   * @param {Object} [options]                                                                                        // 284
   * @param {MongoSortSpecifier} options.sort Sort order (default: natural order)                                     // 285
   * @param {Number} options.skip Number of results to skip at the beginning                                          // 286
   * @param {MongoFieldSpecifier} options.fields Dictionary of fields to return or exclude.                           // 287
   * @param {Boolean} options.reactive (Client only) Default true; pass false to disable reactivity                   // 288
   * @param {Function} options.transform Overrides `transform` on the [`Collection`](#collections) for this cursor.  Pass `null` to disable transformation.
   * @returns {Object}                                                                                                // 290
   */                                                                                                                 // 291
  findOne: function (/* selector, options */) {                                                                       // 292
    var self = this;                                                                                                  // 293
    var argArray = _.toArray(arguments);                                                                              // 294
    return self._collection.findOne(self._getFindSelector(argArray),                                                  // 295
                                    self._getFindOptions(argArray));                                                  // 296
  }                                                                                                                   // 297
                                                                                                                      // 298
});                                                                                                                   // 299
                                                                                                                      // 300
Mongo.Collection._publishCursor = function (cursor, sub, collection) {                                                // 301
  var observeHandle = cursor.observeChanges({                                                                         // 302
    added: function (id, fields) {                                                                                    // 303
      sub.added(collection, id, fields);                                                                              // 304
    },                                                                                                                // 305
    changed: function (id, fields) {                                                                                  // 306
      sub.changed(collection, id, fields);                                                                            // 307
    },                                                                                                                // 308
    removed: function (id) {                                                                                          // 309
      sub.removed(collection, id);                                                                                    // 310
    }                                                                                                                 // 311
  });                                                                                                                 // 312
                                                                                                                      // 313
  // We don't call sub.ready() here: it gets called in livedata_server, after                                         // 314
  // possibly calling _publishCursor on multiple returned cursors.                                                    // 315
                                                                                                                      // 316
  // register stop callback (expects lambda w/ no args).                                                              // 317
  sub.onStop(function () {observeHandle.stop();});                                                                    // 318
};                                                                                                                    // 319
                                                                                                                      // 320
// protect against dangerous selectors.  falsey and {_id: falsey} are both                                            // 321
// likely programmer error, and not what you want, particularly for destructive                                       // 322
// operations.  JS regexps don't serialize over DDP but can be trivially                                              // 323
// replaced by $regex.                                                                                                // 324
Mongo.Collection._rewriteSelector = function (selector) {                                                             // 325
  // shorthand -- scalars match _id                                                                                   // 326
  if (LocalCollection._selectorIsId(selector))                                                                        // 327
    selector = {_id: selector};                                                                                       // 328
                                                                                                                      // 329
  if (!selector || (('_id' in selector) && !selector._id))                                                            // 330
    // can't match anything                                                                                           // 331
    return {_id: Random.id()};                                                                                        // 332
                                                                                                                      // 333
  var ret = {};                                                                                                       // 334
  _.each(selector, function (value, key) {                                                                            // 335
    // Mongo supports both {field: /foo/} and {field: {$regex: /foo/}}                                                // 336
    if (value instanceof RegExp) {                                                                                    // 337
      ret[key] = convertRegexpToMongoSelector(value);                                                                 // 338
    } else if (value && value.$regex instanceof RegExp) {                                                             // 339
      ret[key] = convertRegexpToMongoSelector(value.$regex);                                                          // 340
      // if value is {$regex: /foo/, $options: ...} then $options                                                     // 341
      // override the ones set on $regex.                                                                             // 342
      if (value.$options !== undefined)                                                                               // 343
        ret[key].$options = value.$options;                                                                           // 344
    }                                                                                                                 // 345
    else if (_.contains(['$or','$and','$nor'], key)) {                                                                // 346
      // Translate lower levels of $and/$or/$nor                                                                      // 347
      ret[key] = _.map(value, function (v) {                                                                          // 348
        return Mongo.Collection._rewriteSelector(v);                                                                  // 349
      });                                                                                                             // 350
    } else {                                                                                                          // 351
      ret[key] = value;                                                                                               // 352
    }                                                                                                                 // 353
  });                                                                                                                 // 354
  return ret;                                                                                                         // 355
};                                                                                                                    // 356
                                                                                                                      // 357
// convert a JS RegExp object to a Mongo {$regex: ..., $options: ...}                                                 // 358
// selector                                                                                                           // 359
var convertRegexpToMongoSelector = function (regexp) {                                                                // 360
  check(regexp, RegExp); // safety belt                                                                               // 361
                                                                                                                      // 362
  var selector = {$regex: regexp.source};                                                                             // 363
  var regexOptions = '';                                                                                              // 364
  // JS RegExp objects support 'i', 'm', and 'g'. Mongo regex $options                                                // 365
  // support 'i', 'm', 'x', and 's'. So we support 'i' and 'm' here.                                                  // 366
  if (regexp.ignoreCase)                                                                                              // 367
    regexOptions += 'i';                                                                                              // 368
  if (regexp.multiline)                                                                                               // 369
    regexOptions += 'm';                                                                                              // 370
  if (regexOptions)                                                                                                   // 371
    selector.$options = regexOptions;                                                                                 // 372
                                                                                                                      // 373
  return selector;                                                                                                    // 374
};                                                                                                                    // 375
                                                                                                                      // 376
var throwIfSelectorIsNotId = function (selector, methodName) {                                                        // 377
  if (!LocalCollection._selectorIsIdPerhapsAsObject(selector)) {                                                      // 378
    throw new Meteor.Error(                                                                                           // 379
      403, "Not permitted. Untrusted code may only " + methodName +                                                   // 380
        " documents by ID.");                                                                                         // 381
  }                                                                                                                   // 382
};                                                                                                                    // 383
                                                                                                                      // 384
// 'insert' immediately returns the inserted document's new _id.                                                      // 385
// The others return values immediately if you are in a stub, an in-memory                                            // 386
// unmanaged collection, or a mongo-backed collection and you don't pass a                                            // 387
// callback. 'update' and 'remove' return the number of affected                                                      // 388
// documents. 'upsert' returns an object with keys 'numberAffected' and, if an                                        // 389
// insert happened, 'insertedId'.                                                                                     // 390
//                                                                                                                    // 391
// Otherwise, the semantics are exactly like other methods: they take                                                 // 392
// a callback as an optional last argument; if no callback is                                                         // 393
// provided, they block until the operation is complete, and throw an                                                 // 394
// exception if it fails; if a callback is provided, then they don't                                                  // 395
// necessarily block, and they call the callback when they finish with error and                                      // 396
// result arguments.  (The insert method provides the document ID as its result;                                      // 397
// update and remove provide the number of affected docs as the result; upsert                                        // 398
// provides an object with numberAffected and maybe insertedId.)                                                      // 399
//                                                                                                                    // 400
// On the client, blocking is impossible, so if a callback                                                            // 401
// isn't provided, they just return immediately and any error                                                         // 402
// information is lost.                                                                                               // 403
//                                                                                                                    // 404
// There's one more tweak. On the client, if you don't provide a                                                      // 405
// callback, then if there is an error, a message will be logged with                                                 // 406
// Meteor._debug.                                                                                                     // 407
//                                                                                                                    // 408
// The intent (though this is actually determined by the underlying                                                   // 409
// drivers) is that the operations should be done synchronously, not                                                  // 410
// generating their result until the database has acknowledged                                                        // 411
// them. In the future maybe we should provide a flag to turn this                                                    // 412
// off.                                                                                                               // 413
                                                                                                                      // 414
/**                                                                                                                   // 415
 * @summary Insert a document in the collection.  Returns its unique _id.                                             // 416
 * @locus Anywhere                                                                                                    // 417
 * @method  insert                                                                                                    // 418
 * @memberOf Mongo.Collection                                                                                         // 419
 * @instance                                                                                                          // 420
 * @param {Object} doc The document to insert. May not yet have an _id attribute, in which case Meteor will generate one for you.
 * @param {Function} [callback] Optional.  If present, called with an error object as the first argument and, if no error, the _id as the second.
 */                                                                                                                   // 423
                                                                                                                      // 424
/**                                                                                                                   // 425
 * @summary Modify one or more documents in the collection. Returns the number of affected documents.                 // 426
 * @locus Anywhere                                                                                                    // 427
 * @method update                                                                                                     // 428
 * @memberOf Mongo.Collection                                                                                         // 429
 * @instance                                                                                                          // 430
 * @param {MongoSelector} selector Specifies which documents to modify                                                // 431
 * @param {MongoModifier} modifier Specifies how to modify the documents                                              // 432
 * @param {Object} [options]                                                                                          // 433
 * @param {Boolean} options.multi True to modify all matching documents; false to only modify one of the matching documents (the default).
 * @param {Boolean} options.upsert True to insert a document if no matching documents are found.                      // 435
 * @param {Function} [callback] Optional.  If present, called with an error object as the first argument and, if no error, the number of affected documents as the second.
 */                                                                                                                   // 437
                                                                                                                      // 438
/**                                                                                                                   // 439
 * @summary Remove documents from the collection                                                                      // 440
 * @locus Anywhere                                                                                                    // 441
 * @method remove                                                                                                     // 442
 * @memberOf Mongo.Collection                                                                                         // 443
 * @instance                                                                                                          // 444
 * @param {MongoSelector} selector Specifies which documents to remove                                                // 445
 * @param {Function} [callback] Optional.  If present, called with an error object as its argument.                   // 446
 */                                                                                                                   // 447
                                                                                                                      // 448
_.each(["insert", "update", "remove"], function (name) {                                                              // 449
  Mongo.Collection.prototype[name] = function (/* arguments */) {                                                     // 450
    var self = this;                                                                                                  // 451
    var args = _.toArray(arguments);                                                                                  // 452
    var callback;                                                                                                     // 453
    var insertId;                                                                                                     // 454
    var ret;                                                                                                          // 455
                                                                                                                      // 456
    // Pull off any callback (or perhaps a 'callback' variable that was passed                                        // 457
    // in undefined, like how 'upsert' does it).                                                                      // 458
    if (args.length &&                                                                                                // 459
        (args[args.length - 1] === undefined ||                                                                       // 460
         args[args.length - 1] instanceof Function)) {                                                                // 461
      callback = args.pop();                                                                                          // 462
    }                                                                                                                 // 463
                                                                                                                      // 464
    if (name === "insert") {                                                                                          // 465
      if (!args.length)                                                                                               // 466
        throw new Error("insert requires an argument");                                                               // 467
      // shallow-copy the document and generate an ID                                                                 // 468
      args[0] = _.extend({}, args[0]);                                                                                // 469
      if ('_id' in args[0]) {                                                                                         // 470
        insertId = args[0]._id;                                                                                       // 471
        if (!insertId || !(typeof insertId === 'string'                                                               // 472
              || insertId instanceof Mongo.ObjectID))                                                                 // 473
          throw new Error("Meteor requires document _id fields to be non-empty strings or ObjectIDs");                // 474
      } else {                                                                                                        // 475
        var generateId = true;                                                                                        // 476
        // Don't generate the id if we're the client and the 'outermost' call                                         // 477
        // This optimization saves us passing both the randomSeed and the id                                          // 478
        // Passing both is redundant.                                                                                 // 479
        if (self._connection && self._connection !== Meteor.server) {                                                 // 480
          var enclosing = DDP._CurrentInvocation.get();                                                               // 481
          if (!enclosing) {                                                                                           // 482
            generateId = false;                                                                                       // 483
          }                                                                                                           // 484
        }                                                                                                             // 485
        if (generateId) {                                                                                             // 486
          insertId = args[0]._id = self._makeNewID();                                                                 // 487
        }                                                                                                             // 488
      }                                                                                                               // 489
    } else {                                                                                                          // 490
      args[0] = Mongo.Collection._rewriteSelector(args[0]);                                                           // 491
                                                                                                                      // 492
      if (name === "update") {                                                                                        // 493
        // Mutate args but copy the original options object. We need to add                                           // 494
        // insertedId to options, but don't want to mutate the caller's options                                       // 495
        // object. We need to mutate `args` because we pass `args` into the                                           // 496
        // driver below.                                                                                              // 497
        var options = args[2] = _.clone(args[2]) || {};                                                               // 498
        if (options && typeof options !== "function" && options.upsert) {                                             // 499
          // set `insertedId` if absent.  `insertedId` is a Meteor extension.                                         // 500
          if (options.insertedId) {                                                                                   // 501
            if (!(typeof options.insertedId === 'string'                                                              // 502
                  || options.insertedId instanceof Mongo.ObjectID))                                                   // 503
              throw new Error("insertedId must be string or ObjectID");                                               // 504
          } else {                                                                                                    // 505
            options.insertedId = self._makeNewID();                                                                   // 506
          }                                                                                                           // 507
        }                                                                                                             // 508
      }                                                                                                               // 509
    }                                                                                                                 // 510
                                                                                                                      // 511
    // On inserts, always return the id that we generated; on all other                                               // 512
    // operations, just return the result from the collection.                                                        // 513
    var chooseReturnValueFromCollectionResult = function (result) {                                                   // 514
      if (name === "insert") {                                                                                        // 515
        if (!insertId && result) {                                                                                    // 516
          insertId = result;                                                                                          // 517
        }                                                                                                             // 518
        return insertId;                                                                                              // 519
      } else {                                                                                                        // 520
        return result;                                                                                                // 521
      }                                                                                                               // 522
    };                                                                                                                // 523
                                                                                                                      // 524
    var wrappedCallback;                                                                                              // 525
    if (callback) {                                                                                                   // 526
      wrappedCallback = function (error, result) {                                                                    // 527
        callback(error, ! error && chooseReturnValueFromCollectionResult(result));                                    // 528
      };                                                                                                              // 529
    }                                                                                                                 // 530
                                                                                                                      // 531
    // XXX see #MeteorServerNull                                                                                      // 532
    if (self._connection && self._connection !== Meteor.server) {                                                     // 533
      // just remote to another endpoint, propagate return value or                                                   // 534
      // exception.                                                                                                   // 535
                                                                                                                      // 536
      var enclosing = DDP._CurrentInvocation.get();                                                                   // 537
      var alreadyInSimulation = enclosing && enclosing.isSimulation;                                                  // 538
                                                                                                                      // 539
      if (Meteor.isClient && !wrappedCallback && ! alreadyInSimulation) {                                             // 540
        // Client can't block, so it can't report errors by exception,                                                // 541
        // only by callback. If they forget the callback, give them a                                                 // 542
        // default one that logs the error, so they aren't totally                                                    // 543
        // baffled if their writes don't work because their database is                                               // 544
        // down.                                                                                                      // 545
        // Don't give a default callback in simulation, because inside stubs we                                       // 546
        // want to return the results from the local collection immediately and                                       // 547
        // not force a callback.                                                                                      // 548
        wrappedCallback = function (err) {                                                                            // 549
          if (err)                                                                                                    // 550
            Meteor._debug(name + " failed: " + (err.reason || err.stack));                                            // 551
        };                                                                                                            // 552
      }                                                                                                               // 553
                                                                                                                      // 554
      if (!alreadyInSimulation && name !== "insert") {                                                                // 555
        // If we're about to actually send an RPC, we should throw an error if                                        // 556
        // this is a non-ID selector, because the mutation methods only allow                                         // 557
        // single-ID selectors. (If we don't throw here, we'll see flicker.)                                          // 558
        throwIfSelectorIsNotId(args[0], name);                                                                        // 559
      }                                                                                                               // 560
                                                                                                                      // 561
      ret = chooseReturnValueFromCollectionResult(                                                                    // 562
        self._connection.apply(self._prefix + name, args, {returnStubValue: true}, wrappedCallback)                   // 563
      );                                                                                                              // 564
                                                                                                                      // 565
    } else {                                                                                                          // 566
      // it's my collection.  descend into the collection object                                                      // 567
      // and propagate any exception.                                                                                 // 568
      args.push(wrappedCallback);                                                                                     // 569
      try {                                                                                                           // 570
        // If the user provided a callback and the collection implements this                                         // 571
        // operation asynchronously, then queryRet will be undefined, and the                                         // 572
        // result will be returned through the callback instead.                                                      // 573
        var queryRet = self._collection[name].apply(self._collection, args);                                          // 574
        ret = chooseReturnValueFromCollectionResult(queryRet);                                                        // 575
      } catch (e) {                                                                                                   // 576
        if (callback) {                                                                                               // 577
          callback(e);                                                                                                // 578
          return null;                                                                                                // 579
        }                                                                                                             // 580
        throw e;                                                                                                      // 581
      }                                                                                                               // 582
    }                                                                                                                 // 583
                                                                                                                      // 584
    // both sync and async, unless we threw an exception, return ret                                                  // 585
    // (new document ID for insert, num affected for update/remove, object with                                       // 586
    // numberAffected and maybe insertedId for upsert).                                                               // 587
    return ret;                                                                                                       // 588
  };                                                                                                                  // 589
});                                                                                                                   // 590
                                                                                                                      // 591
/**                                                                                                                   // 592
 * @summary Modify one or more documents in the collection, or insert one if no matching documents were found. Returns an object with keys `numberAffected` (the number of documents modified)  and `insertedId` (the unique _id of the document that was inserted, if any).
 * @locus Anywhere                                                                                                    // 594
 * @param {MongoSelector} selector Specifies which documents to modify                                                // 595
 * @param {MongoModifier} modifier Specifies how to modify the documents                                              // 596
 * @param {Object} [options]                                                                                          // 597
 * @param {Boolean} options.multi True to modify all matching documents; false to only modify one of the matching documents (the default).
 * @param {Function} [callback] Optional.  If present, called with an error object as the first argument and, if no error, the number of affected documents as the second.
 */                                                                                                                   // 600
Mongo.Collection.prototype.upsert = function (selector, modifier,                                                     // 601
                                               options, callback) {                                                   // 602
  var self = this;                                                                                                    // 603
  if (! callback && typeof options === "function") {                                                                  // 604
    callback = options;                                                                                               // 605
    options = {};                                                                                                     // 606
  }                                                                                                                   // 607
  return self.update(selector, modifier,                                                                              // 608
              _.extend({}, options, { _returnObject: true, upsert: true }),                                           // 609
              callback);                                                                                              // 610
};                                                                                                                    // 611
                                                                                                                      // 612
// We'll actually design an index API later. For now, we just pass through to                                         // 613
// Mongo's, but make it synchronous.                                                                                  // 614
Mongo.Collection.prototype._ensureIndex = function (index, options) {                                                 // 615
  var self = this;                                                                                                    // 616
  if (!self._collection._ensureIndex)                                                                                 // 617
    throw new Error("Can only call _ensureIndex on server collections");                                              // 618
  self._collection._ensureIndex(index, options);                                                                      // 619
};                                                                                                                    // 620
Mongo.Collection.prototype._dropIndex = function (index) {                                                            // 621
  var self = this;                                                                                                    // 622
  if (!self._collection._dropIndex)                                                                                   // 623
    throw new Error("Can only call _dropIndex on server collections");                                                // 624
  self._collection._dropIndex(index);                                                                                 // 625
};                                                                                                                    // 626
Mongo.Collection.prototype._dropCollection = function () {                                                            // 627
  var self = this;                                                                                                    // 628
  if (!self._collection.dropCollection)                                                                               // 629
    throw new Error("Can only call _dropCollection on server collections");                                           // 630
  self._collection.dropCollection();                                                                                  // 631
};                                                                                                                    // 632
Mongo.Collection.prototype._createCappedCollection = function (byteSize, maxDocuments) {                              // 633
  var self = this;                                                                                                    // 634
  if (!self._collection._createCappedCollection)                                                                      // 635
    throw new Error("Can only call _createCappedCollection on server collections");                                   // 636
  self._collection._createCappedCollection(byteSize, maxDocuments);                                                   // 637
};                                                                                                                    // 638
                                                                                                                      // 639
/**                                                                                                                   // 640
 * @summary Create a Mongo-style `ObjectID`.  If you don't specify a `hexString`, the `ObjectID` will generated randomly (not using MongoDB's ID construction rules).
 * @locus Anywhere                                                                                                    // 642
 * @class                                                                                                             // 643
 * @param {String} hexString Optional.  The 24-character hexadecimal contents of the ObjectID to create               // 644
 */                                                                                                                   // 645
Mongo.ObjectID = LocalCollection._ObjectID;                                                                           // 646
                                                                                                                      // 647
/**                                                                                                                   // 648
 * @summary To create a cursor, use find. To access the documents in a cursor, use forEach, map, or fetch.            // 649
 * @class                                                                                                             // 650
 * @instanceName cursor                                                                                               // 651
 */                                                                                                                   // 652
Mongo.Cursor = LocalCollection.Cursor;                                                                                // 653
                                                                                                                      // 654
/**                                                                                                                   // 655
 * @deprecated in 0.9.1                                                                                               // 656
 */                                                                                                                   // 657
Mongo.Collection.Cursor = Mongo.Cursor;                                                                               // 658
                                                                                                                      // 659
/**                                                                                                                   // 660
 * @deprecated in 0.9.1                                                                                               // 661
 */                                                                                                                   // 662
Mongo.Collection.ObjectID = Mongo.ObjectID;                                                                           // 663
                                                                                                                      // 664
///                                                                                                                   // 665
/// Remote methods and access control.                                                                                // 666
///                                                                                                                   // 667
                                                                                                                      // 668
// Restrict default mutators on collection. allow() and deny() take the                                               // 669
// same options:                                                                                                      // 670
//                                                                                                                    // 671
// options.insert {Function(userId, doc)}                                                                             // 672
//   return true to allow/deny adding this document                                                                   // 673
//                                                                                                                    // 674
// options.update {Function(userId, docs, fields, modifier)}                                                          // 675
//   return true to allow/deny updating these documents.                                                              // 676
//   `fields` is passed as an array of fields that are to be modified                                                 // 677
//                                                                                                                    // 678
// options.remove {Function(userId, docs)}                                                                            // 679
//   return true to allow/deny removing these documents                                                               // 680
//                                                                                                                    // 681
// options.fetch {Array}                                                                                              // 682
//   Fields to fetch for these validators. If any call to allow or deny                                               // 683
//   does not have this option then all fields are loaded.                                                            // 684
//                                                                                                                    // 685
// allow and deny can be called multiple times. The validators are                                                    // 686
// evaluated as follows:                                                                                              // 687
// - If neither deny() nor allow() has been called on the collection,                                                 // 688
//   then the request is allowed if and only if the "insecure" smart                                                  // 689
//   package is in use.                                                                                               // 690
// - Otherwise, if any deny() function returns true, the request is denied.                                           // 691
// - Otherwise, if any allow() function returns true, the request is allowed.                                         // 692
// - Otherwise, the request is denied.                                                                                // 693
//                                                                                                                    // 694
// Meteor may call your deny() and allow() functions in any order, and may not                                        // 695
// call all of them if it is able to make a decision without calling them all                                         // 696
// (so don't include side effects).                                                                                   // 697
                                                                                                                      // 698
(function () {                                                                                                        // 699
  var addValidator = function(allowOrDeny, options) {                                                                 // 700
    // validate keys                                                                                                  // 701
    var VALID_KEYS = ['insert', 'update', 'remove', 'fetch', 'transform'];                                            // 702
    _.each(_.keys(options), function (key) {                                                                          // 703
      if (!_.contains(VALID_KEYS, key))                                                                               // 704
        throw new Error(allowOrDeny + ": Invalid key: " + key);                                                       // 705
    });                                                                                                               // 706
                                                                                                                      // 707
    var self = this;                                                                                                  // 708
    self._restricted = true;                                                                                          // 709
                                                                                                                      // 710
    _.each(['insert', 'update', 'remove'], function (name) {                                                          // 711
      if (options[name]) {                                                                                            // 712
        if (!(options[name] instanceof Function)) {                                                                   // 713
          throw new Error(allowOrDeny + ": Value for `" + name + "` must be a function");                             // 714
        }                                                                                                             // 715
                                                                                                                      // 716
        // If the transform is specified at all (including as 'null') in this                                         // 717
        // call, then take that; otherwise, take the transform from the                                               // 718
        // collection.                                                                                                // 719
        if (options.transform === undefined) {                                                                        // 720
          options[name].transform = self._transform;  // already wrapped                                              // 721
        } else {                                                                                                      // 722
          options[name].transform = LocalCollection.wrapTransform(                                                    // 723
            options.transform);                                                                                       // 724
        }                                                                                                             // 725
                                                                                                                      // 726
        self._validators[name][allowOrDeny].push(options[name]);                                                      // 727
      }                                                                                                               // 728
    });                                                                                                               // 729
                                                                                                                      // 730
    // Only update the fetch fields if we're passed things that affect                                                // 731
    // fetching. This way allow({}) and allow({insert: f}) don't result in                                            // 732
    // setting fetchAllFields                                                                                         // 733
    if (options.update || options.remove || options.fetch) {                                                          // 734
      if (options.fetch && !(options.fetch instanceof Array)) {                                                       // 735
        throw new Error(allowOrDeny + ": Value for `fetch` must be an array");                                        // 736
      }                                                                                                               // 737
      self._updateFetch(options.fetch);                                                                               // 738
    }                                                                                                                 // 739
  };                                                                                                                  // 740
                                                                                                                      // 741
  /**                                                                                                                 // 742
   * @summary Allow users to write directly to this collection from client code, subject to limitations you define.   // 743
   * @locus Server                                                                                                    // 744
   * @param {Object} options                                                                                          // 745
   * @param {Function} options.insert,update,remove Functions that look at a proposed modification to the database and return true if it should be allowed.
   * @param {String[]} options.fetch Optional performance enhancement. Limits the fields that will be fetched from the database for inspection by your `update` and `remove` functions.
   * @param {Function} options.transform Overrides `transform` on the  [`Collection`](#collections).  Pass `null` to disable transformation.
   */                                                                                                                 // 749
  Mongo.Collection.prototype.allow = function(options) {                                                              // 750
    addValidator.call(this, 'allow', options);                                                                        // 751
  };                                                                                                                  // 752
                                                                                                                      // 753
  /**                                                                                                                 // 754
   * @summary Override `allow` rules.                                                                                 // 755
   * @locus Server                                                                                                    // 756
   * @param {Object} options                                                                                          // 757
   * @param {Function} options.insert,update,remove Functions that look at a proposed modification to the database and return true if it should be denied, even if an [allow](#allow) rule says otherwise.
   * @param {String[]} options.fetch Optional performance enhancement. Limits the fields that will be fetched from the database for inspection by your `update` and `remove` functions.
   * @param {Function} options.transform Overrides `transform` on the  [`Collection`](#collections).  Pass `null` to disable transformation.
   */                                                                                                                 // 761
  Mongo.Collection.prototype.deny = function(options) {                                                               // 762
    addValidator.call(this, 'deny', options);                                                                         // 763
  };                                                                                                                  // 764
})();                                                                                                                 // 765
                                                                                                                      // 766
                                                                                                                      // 767
Mongo.Collection.prototype._defineMutationMethods = function() {                                                      // 768
  var self = this;                                                                                                    // 769
                                                                                                                      // 770
  // set to true once we call any allow or deny methods. If true, use                                                 // 771
  // allow/deny semantics. If false, use insecure mode semantics.                                                     // 772
  self._restricted = false;                                                                                           // 773
                                                                                                                      // 774
  // Insecure mode (default to allowing writes). Defaults to 'undefined' which                                        // 775
  // means insecure iff the insecure package is loaded. This property can be                                          // 776
  // overriden by tests or packages wishing to change insecure mode behavior of                                       // 777
  // their collections.                                                                                               // 778
  self._insecure = undefined;                                                                                         // 779
                                                                                                                      // 780
  self._validators = {                                                                                                // 781
    insert: {allow: [], deny: []},                                                                                    // 782
    update: {allow: [], deny: []},                                                                                    // 783
    remove: {allow: [], deny: []},                                                                                    // 784
    upsert: {allow: [], deny: []}, // dummy arrays; can't set these!                                                  // 785
    fetch: [],                                                                                                        // 786
    fetchAllFields: false                                                                                             // 787
  };                                                                                                                  // 788
                                                                                                                      // 789
  if (!self._name)                                                                                                    // 790
    return; // anonymous collection                                                                                   // 791
                                                                                                                      // 792
  // XXX Think about method namespacing. Maybe methods should be                                                      // 793
  // "Meteor:Mongo:insert/NAME"?                                                                                      // 794
  self._prefix = '/' + self._name + '/';                                                                              // 795
                                                                                                                      // 796
  // mutation methods                                                                                                 // 797
  if (self._connection) {                                                                                             // 798
    var m = {};                                                                                                       // 799
                                                                                                                      // 800
    _.each(['insert', 'update', 'remove'], function (method) {                                                        // 801
      m[self._prefix + method] = function (/* ... */) {                                                               // 802
        // All the methods do their own validation, instead of using check().                                         // 803
        check(arguments, [Match.Any]);                                                                                // 804
        var args = _.toArray(arguments);                                                                              // 805
        try {                                                                                                         // 806
          // For an insert, if the client didn't specify an _id, generate one                                         // 807
          // now; because this uses DDP.randomStream, it will be consistent with                                      // 808
          // what the client generated. We generate it now rather than later so                                       // 809
          // that if (eg) an allow/deny rule does an insert to the same                                               // 810
          // collection (not that it really should), the generated _id will                                           // 811
          // still be the first use of the stream and will be consistent.                                             // 812
          //                                                                                                          // 813
          // However, we don't actually stick the _id onto the document yet,                                          // 814
          // because we want allow/deny rules to be able to differentiate                                             // 815
          // between arbitrary client-specified _id fields and merely                                                 // 816
          // client-controlled-via-randomSeed fields.                                                                 // 817
          var generatedId = null;                                                                                     // 818
          if (method === "insert" && !_.has(args[0], '_id')) {                                                        // 819
            generatedId = self._makeNewID();                                                                          // 820
          }                                                                                                           // 821
                                                                                                                      // 822
          if (this.isSimulation) {                                                                                    // 823
            // In a client simulation, you can do any mutation (even with a                                           // 824
            // complex selector).                                                                                     // 825
            if (generatedId !== null)                                                                                 // 826
              args[0]._id = generatedId;                                                                              // 827
            return self._collection[method].apply(                                                                    // 828
              self._collection, args);                                                                                // 829
          }                                                                                                           // 830
                                                                                                                      // 831
          // This is the server receiving a method call from the client.                                              // 832
                                                                                                                      // 833
          // We don't allow arbitrary selectors in mutations from the client: only                                    // 834
          // single-ID selectors.                                                                                     // 835
          if (method !== 'insert')                                                                                    // 836
            throwIfSelectorIsNotId(args[0], method);                                                                  // 837
                                                                                                                      // 838
          if (self._restricted) {                                                                                     // 839
            // short circuit if there is no way it will pass.                                                         // 840
            if (self._validators[method].allow.length === 0) {                                                        // 841
              throw new Meteor.Error(                                                                                 // 842
                403, "Access denied. No allow validators set on restricted " +                                        // 843
                  "collection for method '" + method + "'.");                                                         // 844
            }                                                                                                         // 845
                                                                                                                      // 846
            var validatedMethodName =                                                                                 // 847
                  '_validated' + method.charAt(0).toUpperCase() + method.slice(1);                                    // 848
            args.unshift(this.userId);                                                                                // 849
            method === 'insert' && args.push(generatedId);                                                            // 850
            return self[validatedMethodName].apply(self, args);                                                       // 851
          } else if (self._isInsecure()) {                                                                            // 852
            if (generatedId !== null)                                                                                 // 853
              args[0]._id = generatedId;                                                                              // 854
            // In insecure mode, allow any mutation (with a simple selector).                                         // 855
            // XXX This is kind of bogus.  Instead of blindly passing whatever                                        // 856
            //     we get from the network to this function, we should actually                                       // 857
            //     know the correct arguments for the function and pass just                                          // 858
            //     them.  For example, if you have an extraneous extra null                                           // 859
            //     argument and this is Mongo on the server, the .wrapAsync'd                                         // 860
            //     functions like update will get confused and pass the                                               // 861
            //     "fut.resolver()" in the wrong slot, where _update will never                                       // 862
            //     invoke it. Bam, broken DDP connection.  Probably should just                                       // 863
            //     take this whole method and write it three times, invoking                                          // 864
            //     helpers for the common code.                                                                       // 865
            return self._collection[method].apply(self._collection, args);                                            // 866
          } else {                                                                                                    // 867
            // In secure mode, if we haven't called allow or deny, then nothing                                       // 868
            // is permitted.                                                                                          // 869
            throw new Meteor.Error(403, "Access denied");                                                             // 870
          }                                                                                                           // 871
        } catch (e) {                                                                                                 // 872
          if (e.name === 'MongoError' || e.name === 'MinimongoError') {                                               // 873
            throw new Meteor.Error(409, e.toString());                                                                // 874
          } else {                                                                                                    // 875
            throw e;                                                                                                  // 876
          }                                                                                                           // 877
        }                                                                                                             // 878
      };                                                                                                              // 879
    });                                                                                                               // 880
    // Minimongo on the server gets no stubs; instead, by default                                                     // 881
    // it wait()s until its result is ready, yielding.                                                                // 882
    // This matches the behavior of macromongo on the server better.                                                  // 883
    // XXX see #MeteorServerNull                                                                                      // 884
    if (Meteor.isClient || self._connection === Meteor.server)                                                        // 885
      self._connection.methods(m);                                                                                    // 886
  }                                                                                                                   // 887
};                                                                                                                    // 888
                                                                                                                      // 889
                                                                                                                      // 890
Mongo.Collection.prototype._updateFetch = function (fields) {                                                         // 891
  var self = this;                                                                                                    // 892
                                                                                                                      // 893
  if (!self._validators.fetchAllFields) {                                                                             // 894
    if (fields) {                                                                                                     // 895
      self._validators.fetch = _.union(self._validators.fetch, fields);                                               // 896
    } else {                                                                                                          // 897
      self._validators.fetchAllFields = true;                                                                         // 898
      // clear fetch just to make sure we don't accidentally read it                                                  // 899
      self._validators.fetch = null;                                                                                  // 900
    }                                                                                                                 // 901
  }                                                                                                                   // 902
};                                                                                                                    // 903
                                                                                                                      // 904
Mongo.Collection.prototype._isInsecure = function () {                                                                // 905
  var self = this;                                                                                                    // 906
  if (self._insecure === undefined)                                                                                   // 907
    return !!Package.insecure;                                                                                        // 908
  return self._insecure;                                                                                              // 909
};                                                                                                                    // 910
                                                                                                                      // 911
var docToValidate = function (validator, doc, generatedId) {                                                          // 912
  var ret = doc;                                                                                                      // 913
  if (validator.transform) {                                                                                          // 914
    ret = EJSON.clone(doc);                                                                                           // 915
    // If you set a server-side transform on your collection, then you don't get                                      // 916
    // to tell the difference between "client specified the ID" and "server                                           // 917
    // generated the ID", because transforms expect to get _id.  If you want to                                       // 918
    // do that check, you can do it with a specific                                                                   // 919
    // `C.allow({insert: f, transform: null})` validator.                                                             // 920
    if (generatedId !== null) {                                                                                       // 921
      ret._id = generatedId;                                                                                          // 922
    }                                                                                                                 // 923
    ret = validator.transform(ret);                                                                                   // 924
  }                                                                                                                   // 925
  return ret;                                                                                                         // 926
};                                                                                                                    // 927
                                                                                                                      // 928
Mongo.Collection.prototype._validatedInsert = function (userId, doc,                                                  // 929
                                                         generatedId) {                                               // 930
  var self = this;                                                                                                    // 931
                                                                                                                      // 932
  // call user validators.                                                                                            // 933
  // Any deny returns true means denied.                                                                              // 934
  if (_.any(self._validators.insert.deny, function(validator) {                                                       // 935
    return validator(userId, docToValidate(validator, doc, generatedId));                                             // 936
  })) {                                                                                                               // 937
    throw new Meteor.Error(403, "Access denied");                                                                     // 938
  }                                                                                                                   // 939
  // Any allow returns true means proceed. Throw error if they all fail.                                              // 940
  if (_.all(self._validators.insert.allow, function(validator) {                                                      // 941
    return !validator(userId, docToValidate(validator, doc, generatedId));                                            // 942
  })) {                                                                                                               // 943
    throw new Meteor.Error(403, "Access denied");                                                                     // 944
  }                                                                                                                   // 945
                                                                                                                      // 946
  // If we generated an ID above, insert it now: after the validation, but                                            // 947
  // before actually inserting.                                                                                       // 948
  if (generatedId !== null)                                                                                           // 949
    doc._id = generatedId;                                                                                            // 950
                                                                                                                      // 951
  self._collection.insert.call(self._collection, doc);                                                                // 952
};                                                                                                                    // 953
                                                                                                                      // 954
var transformDoc = function (validator, doc) {                                                                        // 955
  if (validator.transform)                                                                                            // 956
    return validator.transform(doc);                                                                                  // 957
  return doc;                                                                                                         // 958
};                                                                                                                    // 959
                                                                                                                      // 960
// Simulate a mongo `update` operation while validating that the access                                               // 961
// control rules set by calls to `allow/deny` are satisfied. If all                                                   // 962
// pass, rewrite the mongo operation to use $in to set the list of                                                    // 963
// document ids to change ##ValidatedChange                                                                           // 964
Mongo.Collection.prototype._validatedUpdate = function(                                                               // 965
    userId, selector, mutator, options) {                                                                             // 966
  var self = this;                                                                                                    // 967
                                                                                                                      // 968
  check(mutator, Object);                                                                                             // 969
                                                                                                                      // 970
  options = _.clone(options) || {};                                                                                   // 971
                                                                                                                      // 972
  if (!LocalCollection._selectorIsIdPerhapsAsObject(selector))                                                        // 973
    throw new Error("validated update should be of a single ID");                                                     // 974
                                                                                                                      // 975
  // We don't support upserts because they don't fit nicely into allow/deny                                           // 976
  // rules.                                                                                                           // 977
  if (options.upsert)                                                                                                 // 978
    throw new Meteor.Error(403, "Access denied. Upserts not " +                                                       // 979
                           "allowed in a restricted collection.");                                                    // 980
                                                                                                                      // 981
  var noReplaceError = "Access denied. In a restricted collection you can only" +                                     // 982
        " update documents, not replace them. Use a Mongo update operator, such " +                                   // 983
        "as '$set'.";                                                                                                 // 984
                                                                                                                      // 985
  // compute modified fields                                                                                          // 986
  var fields = [];                                                                                                    // 987
  if (_.isEmpty(mutator)) {                                                                                           // 988
    throw new Meteor.Error(403, noReplaceError);                                                                      // 989
  }                                                                                                                   // 990
  _.each(mutator, function (params, op) {                                                                             // 991
    if (op.charAt(0) !== '$') {                                                                                       // 992
      throw new Meteor.Error(403, noReplaceError);                                                                    // 993
    } else if (!_.has(ALLOWED_UPDATE_OPERATIONS, op)) {                                                               // 994
      throw new Meteor.Error(                                                                                         // 995
        403, "Access denied. Operator " + op + " not allowed in a restricted collection.");                           // 996
    } else {                                                                                                          // 997
      _.each(_.keys(params), function (field) {                                                                       // 998
        // treat dotted fields as if they are replacing their                                                         // 999
        // top-level part                                                                                             // 1000
        if (field.indexOf('.') !== -1)                                                                                // 1001
          field = field.substring(0, field.indexOf('.'));                                                             // 1002
                                                                                                                      // 1003
        // record the field we are trying to change                                                                   // 1004
        if (!_.contains(fields, field))                                                                               // 1005
          fields.push(field);                                                                                         // 1006
      });                                                                                                             // 1007
    }                                                                                                                 // 1008
  });                                                                                                                 // 1009
                                                                                                                      // 1010
  var findOptions = {transform: null};                                                                                // 1011
  if (!self._validators.fetchAllFields) {                                                                             // 1012
    findOptions.fields = {};                                                                                          // 1013
    _.each(self._validators.fetch, function(fieldName) {                                                              // 1014
      findOptions.fields[fieldName] = 1;                                                                              // 1015
    });                                                                                                               // 1016
  }                                                                                                                   // 1017
                                                                                                                      // 1018
  var doc = self._collection.findOne(selector, findOptions);                                                          // 1019
  if (!doc)  // none satisfied!                                                                                       // 1020
    return 0;                                                                                                         // 1021
                                                                                                                      // 1022
  var factoriedDoc;                                                                                                   // 1023
                                                                                                                      // 1024
  // call user validators.                                                                                            // 1025
  // Any deny returns true means denied.                                                                              // 1026
  if (_.any(self._validators.update.deny, function(validator) {                                                       // 1027
    if (!factoriedDoc)                                                                                                // 1028
      factoriedDoc = transformDoc(validator, doc);                                                                    // 1029
    return validator(userId,                                                                                          // 1030
                     factoriedDoc,                                                                                    // 1031
                     fields,                                                                                          // 1032
                     mutator);                                                                                        // 1033
  })) {                                                                                                               // 1034
    throw new Meteor.Error(403, "Access denied");                                                                     // 1035
  }                                                                                                                   // 1036
  // Any allow returns true means proceed. Throw error if they all fail.                                              // 1037
  if (_.all(self._validators.update.allow, function(validator) {                                                      // 1038
    if (!factoriedDoc)                                                                                                // 1039
      factoriedDoc = transformDoc(validator, doc);                                                                    // 1040
    return !validator(userId,                                                                                         // 1041
                      factoriedDoc,                                                                                   // 1042
                      fields,                                                                                         // 1043
                      mutator);                                                                                       // 1044
  })) {                                                                                                               // 1045
    throw new Meteor.Error(403, "Access denied");                                                                     // 1046
  }                                                                                                                   // 1047
                                                                                                                      // 1048
  options._forbidReplace = true;                                                                                      // 1049
                                                                                                                      // 1050
  // Back when we supported arbitrary client-provided selectors, we actually                                          // 1051
  // rewrote the selector to include an _id clause before passing to Mongo to                                         // 1052
  // avoid races, but since selector is guaranteed to already just be an ID, we                                       // 1053
  // don't have to any more.                                                                                          // 1054
                                                                                                                      // 1055
  return self._collection.update.call(                                                                                // 1056
    self._collection, selector, mutator, options);                                                                    // 1057
};                                                                                                                    // 1058
                                                                                                                      // 1059
// Only allow these operations in validated updates. Specifically                                                     // 1060
// whitelist operations, rather than blacklist, so new complex                                                        // 1061
// operations that are added aren't automatically allowed. A complex                                                  // 1062
// operation is one that does more than just modify its target                                                        // 1063
// field. For now this contains all update operations except '$rename'.                                               // 1064
// http://docs.mongodb.org/manual/reference/operators/#update                                                         // 1065
var ALLOWED_UPDATE_OPERATIONS = {                                                                                     // 1066
  $inc:1, $set:1, $unset:1, $addToSet:1, $pop:1, $pullAll:1, $pull:1,                                                 // 1067
  $pushAll:1, $push:1, $bit:1                                                                                         // 1068
};                                                                                                                    // 1069
                                                                                                                      // 1070
// Simulate a mongo `remove` operation while validating access control                                                // 1071
// rules. See #ValidatedChange                                                                                        // 1072
Mongo.Collection.prototype._validatedRemove = function(userId, selector) {                                            // 1073
  var self = this;                                                                                                    // 1074
                                                                                                                      // 1075
  var findOptions = {transform: null};                                                                                // 1076
  if (!self._validators.fetchAllFields) {                                                                             // 1077
    findOptions.fields = {};                                                                                          // 1078
    _.each(self._validators.fetch, function(fieldName) {                                                              // 1079
      findOptions.fields[fieldName] = 1;                                                                              // 1080
    });                                                                                                               // 1081
  }                                                                                                                   // 1082
                                                                                                                      // 1083
  var doc = self._collection.findOne(selector, findOptions);                                                          // 1084
  if (!doc)                                                                                                           // 1085
    return 0;                                                                                                         // 1086
                                                                                                                      // 1087
  // call user validators.                                                                                            // 1088
  // Any deny returns true means denied.                                                                              // 1089
  if (_.any(self._validators.remove.deny, function(validator) {                                                       // 1090
    return validator(userId, transformDoc(validator, doc));                                                           // 1091
  })) {                                                                                                               // 1092
    throw new Meteor.Error(403, "Access denied");                                                                     // 1093
  }                                                                                                                   // 1094
  // Any allow returns true means proceed. Throw error if they all fail.                                              // 1095
  if (_.all(self._validators.remove.allow, function(validator) {                                                      // 1096
    return !validator(userId, transformDoc(validator, doc));                                                          // 1097
  })) {                                                                                                               // 1098
    throw new Meteor.Error(403, "Access denied");                                                                     // 1099
  }                                                                                                                   // 1100
                                                                                                                      // 1101
  // Back when we supported arbitrary client-provided selectors, we actually                                          // 1102
  // rewrote the selector to {_id: {$in: [ids that we found]}} before passing to                                      // 1103
  // Mongo to avoid races, but since selector is guaranteed to already just be                                        // 1104
  // an ID, we don't have to any more.                                                                                // 1105
                                                                                                                      // 1106
  return self._collection.remove.call(self._collection, selector);                                                    // 1107
};                                                                                                                    // 1108
                                                                                                                      // 1109
/**                                                                                                                   // 1110
 * @deprecated in 0.9.1                                                                                               // 1111
 */                                                                                                                   // 1112
Meteor.Collection = Mongo.Collection;                                                                                 // 1113
                                                                                                                      // 1114
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package.mongo = {
  Mongo: Mongo
};

})();
