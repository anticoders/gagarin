(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var DDP = Package.ddp.DDP;
var DDPServer = Package.ddp.DDPServer;
var _ = Package.underscore._;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;

/* Package-scope variables */
var Gagarin;

(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/anti:gagarin/meteor/settings.js                                                                         //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
                                                                                                                    // 1
// server only!                                                                                                     // 2
                                                                                                                    // 3
if (!Meteor.settings.gagarin && process.env.GAGARIN_SETTINGS) {                                                     // 4
  try {                                                                                                             // 5
    Meteor.settings.gagarin = JSON.parse(process.env.GAGARIN_SETTINGS);                                             // 6
  } catch (err) {                                                                                                   // 7
    console.warn('invalid Gagarin settings\n', err);                                                                // 8
  }                                                                                                                 // 9
}                                                                                                                   // 10
                                                                                                                    // 11
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/anti:gagarin/meteor/gagarin.js                                                                          //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
                                                                                                                    // 1
var settings = Meteor.settings && Meteor.settings.gagarin;                                                          // 2
                                                                                                                    // 3
if (Package['anti:gagarin']) { // it might get created by a fixture                                                 // 4
  Gagarin = Package['anti:gagarin'].Gagarin;                                                                        // 5
} else {                                                                                                            // 6
  Gagarin = {};                                                                                                     // 7
}                                                                                                                   // 8
                                                                                                                    // 9
Gagarin.isActive = !!settings;                                                                                      // 10
                                                                                                                    // 11
if (Gagarin.isActive) {                                                                                             // 12
  Gagarin.settings = settings;                                                                                      // 13
}                                                                                                                   // 14
                                                                                                                    // 15
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/anti:gagarin/meteor/backdoor.js                                                                         //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
                                                                                                                    // 1
var vm = Npm.require('vm');                                                                                         // 2
var Fiber = Npm.require('fibers');                                                                                  // 3
var Future = Npm.require('fibers/future');                                                                          // 4
                                                                                                                    // 5
if (Gagarin.isActive) {                                                                                             // 6
                                                                                                                    // 7
  // TODO: also protect these methods with some authentication (user/password/token?)                               // 8
  //       note that required data my be provided with GAGARIN_SETTINGS                                             // 9
                                                                                                                    // 10
  Meteor.methods({                                                                                                  // 11
                                                                                                                    // 12
    '/gagarin/execute': function (closure, code, args) {                                                            // 13
      "use strict";                                                                                                 // 14
                                                                                                                    // 15
      args = args || [];                                                                                            // 16
                                                                                                                    // 17
      check(code, String);                                                                                          // 18
      check(args, Array);                                                                                           // 19
      check(closure, Object);                                                                                       // 20
                                                                                                                    // 21
      var context = vm.createContext(global);                                                                       // 22
      context.Fiber = Fiber;                                                                                        // 23
      try {                                                                                                         // 24
        vm.runInContext("value = " + wrapSourceCode(code, args, closure), context);                                 // 25
      } catch (err) {                                                                                               // 26
        throw new Meteor.Error(400, err);                                                                           // 27
      }                                                                                                             // 28
      if (typeof context.value === 'function') {                                                                    // 29
        var feedback;                                                                                               // 30
        try {                                                                                                       // 31
          feedback = context.value.apply(null, values(closure));                                                    // 32
        } catch (err) {                                                                                             // 33
          feedback = { error: err.message };                                                                        // 34
        }                                                                                                           // 35
        return feedback;                                                                                            // 36
      }                                                                                                             // 37
    },                                                                                                              // 38
                                                                                                                    // 39
    '/gagarin/promise': function (closure, code, args) {                                                            // 40
      "use strict";                                                                                                 // 41
                                                                                                                    // 42
      args = args || [];                                                                                            // 43
                                                                                                                    // 44
      check(code, String);                                                                                          // 45
      check(args, Array);                                                                                           // 46
      check(closure, Object);                                                                                       // 47
                                                                                                                    // 48
      var future = new Future();                                                                                    // 49
      var context = vm.createContext(global);                                                                       // 50
                                                                                                                    // 51
      context.Fiber = Fiber;                                                                                        // 52
                                                                                                                    // 53
      var chunks = [];                                                                                              // 54
                                                                                                                    // 55
      var keys = Object.keys(closure).map(function (key) {                                                          // 56
        return stringify(key) + ": " + key;                                                                         // 57
      }).join(',');                                                                                                 // 58
                                                                                                                    // 59
      args = args.map(stringify);                                                                                   // 60
                                                                                                                    // 61
      args.unshift("(function (cb) {\n    return function ($) {\n      setTimeout(function () { cb({ error : $, closure: {" + keys + "}}); });\n    };\n  })(arguments[arguments.length-1])");
      args.unshift("(function (cb) {\n    return function ($) {\n      setTimeout(function () { cb({ value : $, closure: {" + keys + "}}); });\n    };\n  })(arguments[arguments.length-1])");
                                                                                                                    // 64
      chunks.push(                                                                                                  // 65
        "function (" + Object.keys(closure).join(', ') + ") {",                                                     // 66
        "  'use strict';",                                                                                          // 67
        "  var either = function (first) {",                                                                        // 68
        "    return {",                                                                                             // 69
        "      or: function (second) {",                                                                            // 70
        "        return function (arg1, arg2) {",                                                                   // 71
        "          return arg1 ? first(arg1) : second(arg2);",                                                      // 72
        "        };",                                                                                               // 73
        "      }",                                                                                                  // 74
        "    };",                                                                                                   // 75
        "  };",                                                                                                     // 76
        "  try {",                                                                                                  // 77
        "    (" + code + ")(",                                                                                      // 78
        "    " + args.join(', ') + ");",                                                                            // 79
        "  } catch ($) {",                                                                                          // 80
        "    arguments[arguments.length-1]({",                                                                      // 81
        "      error   : $.message,",                                                                               // 82
        "      closure : { " + keys + " }",                                                                         // 83
        "    });",                                                                                                  // 84
        "  }",                                                                                                      // 85
        "}"                                                                                                         // 86
      );                                                                                                            // 87
                                                                                                                    // 88
      //console.log(chunks.join('\n'));                                                                             // 89
                                                                                                                    // 90
      try {                                                                                                         // 91
        vm.runInContext("value = " + chunks.join('\n'), context);                                                   // 92
      } catch (err) {                                                                                               // 93
        throw new Meteor.Error(err);                                                                                // 94
      }                                                                                                             // 95
                                                                                                                    // 96
      if (typeof context.value === 'function') {                                                                    // 97
        try {                                                                                                       // 98
          context.value.apply(null, values(closure, function (feedback) {                                           // 99
            if (feedback.error && typeof feedback.error === 'object') {                                             // 100
              feedback.error = feedback.error.message;                                                              // 101
            }                                                                                                       // 102
            future['return'](feedback);                                                                             // 103
          }));                                                                                                      // 104
        } catch (err) {                                                                                             // 105
          throw new Meteor.Error(err);                                                                              // 106
        }                                                                                                           // 107
        return future.wait();                                                                                       // 108
      }                                                                                                             // 109
    },                                                                                                              // 110
                                                                                                                    // 111
    '/gagarin/wait': function (closure, timeout, message, code, args) {                                             // 112
      "use strict";                                                                                                 // 113
                                                                                                                    // 114
      args = args || [];                                                                                            // 115
                                                                                                                    // 116
      check(timeout, Number);                                                                                       // 117
      check(message, String);                                                                                       // 118
      check(code, String);                                                                                          // 119
      check(args, Array);                                                                                           // 120
      check(closure, Object);                                                                                       // 121
                                                                                                                    // 122
      var future  = new Future();                                                                                   // 123
      var done    = false;                                                                                          // 124
      var handle1 = null;                                                                                           // 125
      var handle2 = null;                                                                                           // 126
      var context = vm.createContext(global);                                                                       // 127
                                                                                                                    // 128
      context.Fiber = Fiber;                                                                                        // 129
                                                                                                                    // 130
      function resolve (feedback) {                                                                                 // 131
        // TODO: can we do away with this sentinel?                                                                 // 132
        if (done) {                                                                                                 // 133
          return;                                                                                                   // 134
        }                                                                                                           // 135
        done = true;                                                                                                // 136
        if (!feedback.closure) {                                                                                    // 137
          feedback.closure = closure;                                                                               // 138
        }                                                                                                           // 139
        if (feedback.error && typeof feedback.error === 'object') {                                                 // 140
          feedback.error = feedback.error.message;                                                                  // 141
        }                                                                                                           // 142
        future['return'](feedback);                                                                                 // 143
        //-------------------------                                                                                 // 144
        clearTimeout(handle1);                                                                                      // 145
        clearTimeout(handle2);                                                                                      // 146
      }                                                                                                             // 147
                                                                                                                    // 148
      try {                                                                                                         // 149
        vm.runInContext("value = " + wrapSourceCode(code, args, closure), context);                                 // 150
      } catch (err) {                                                                                               // 151
        resolve({ error: err });                                                                                    // 152
      }                                                                                                             // 153
                                                                                                                    // 154
      if (!done && typeof context.value === 'function') {                                                           // 155
                                                                                                                    // 156
        // XXX this should be defined prior to the fist call to test, because                                       // 157
        //     the latter can return immediatelly                                                                   // 158
                                                                                                                    // 159
        handle2 = setTimeout(function () {                                                                          // 160
          resolve({ error: 'I have been waiting for ' + timeout + ' ms ' + message + ', but it did not happen.' }); // 161
        }, timeout);                                                                                                // 162
                                                                                                                    // 163
        (function test() {                                                                                          // 164
          var feedback;                                                                                             // 165
          try {                                                                                                     // 166
            feedback = context.value.apply(null, values(closure));                                                  // 167
                                                                                                                    // 168
            if (feedback.value || feedback.error) {                                                                 // 169
              resolve(feedback);                                                                                    // 170
            }                                                                                                       // 171
                                                                                                                    // 172
            handle1 = setTimeout(Meteor.bindEnvironment(test), 50); // repeat after 1/20 sec.                       // 173
                                                                                                                    // 174
            if (feedback.closure) {                                                                                 // 175
              closure = feedback.closure;                                                                           // 176
            }                                                                                                       // 177
                                                                                                                    // 178
          } catch (err) {                                                                                           // 179
            resolve({ error: err });                                                                                // 180
          }                                                                                                         // 181
        }());                                                                                                       // 182
                                                                                                                    // 183
      } else {                                                                                                      // 184
        resolve({ error: 'code has to be a function' })                                                             // 185
      }                                                                                                             // 186
                                                                                                                    // 187
      return future.wait();                                                                                         // 188
    },                                                                                                              // 189
                                                                                                                    // 190
  });                                                                                                               // 191
                                                                                                                    // 192
  Meteor.startup(function () {                                                                                      // 193
    console.log('Поехали!'); // Let's ride! (Gagarin, during the Vostok 1 launch)                                   // 194
  });                                                                                                               // 195
                                                                                                                    // 196
}                                                                                                                   // 197
                                                                                                                    // 198
/**                                                                                                                 // 199
 * Creates a source code of another function, providing the given                                                   // 200
 * arguments and injecting the given closure variables.                                                             // 201
 *                                                                                                                  // 202
 * @param {String} code                                                                                             // 203
 * @param {Array} args                                                                                              // 204
 * @param {Object} closure                                                                                          // 205
 */                                                                                                                 // 206
function wrapSourceCode(code, args, closure) {                                                                      // 207
  "use strict";                                                                                                     // 208
                                                                                                                    // 209
  var chunks = [];                                                                                                  // 210
                                                                                                                    // 211
  chunks.push(                                                                                                      // 212
    "function (" + Object.keys(closure).join(', ') + ") {",                                                         // 213
    "  'use strict';"                                                                                               // 214
  );                                                                                                                // 215
                                                                                                                    // 216
  chunks.push(                                                                                                      // 217
    "  try {",                                                                                                      // 218
    "    return (function ($) {",                                                                                   // 219
    "      return {",                                                                                               // 220
    "        closure: {"                                                                                            // 221
  );                                                                                                                // 222
                                                                                                                    // 223
  Object.keys(closure).forEach(function (key) {                                                                     // 224
    chunks.push("          " + stringify(key) + ": " + key + ",");                                                  // 225
  });                                                                                                               // 226
                                                                                                                    // 227
  chunks.push(                                                                                                      // 228
    "        },",                                                                                                   // 229
    "        value: $,",                                                                                            // 230
    "      };",                                                                                                     // 231
    "    })( (" + code + ")(" + args.map(stringify).join(',') + ") );",                                             // 232
    "  } catch (err) {",                                                                                            // 233
    "    return {",                                                                                                 // 234
    "      closure: {"                                                                                              // 235
  );                                                                                                                // 236
                                                                                                                    // 237
  Object.keys(closure).forEach(function (key) {                                                                     // 238
    chunks.push("        " + stringify(key) + ": " + key + ",");                                                    // 239
  });                                                                                                               // 240
                                                                                                                    // 241
  chunks.push(                                                                                                      // 242
    "      },",                                                                                                     // 243
    "      error: err.message",                                                                                     // 244
    "    };",                                                                                                       // 245
    "  }",                                                                                                          // 246
    "}"                                                                                                             // 247
  );                                                                                                                // 248
                                                                                                                    // 249
  return chunks.join('\n');                                                                                         // 250
}                                                                                                                   // 251
                                                                                                                    // 252
/**                                                                                                                 // 253
 * Returns all values of the object, sorted                                                                         // 254
 * alphabetically by corresponding keys.                                                                            // 255
 *                                                                                                                  // 256
 * @param {Object}                                                                                                  // 257
 */                                                                                                                 // 258
function values(object) {                                                                                           // 259
  "use strict";                                                                                                     // 260
                                                                                                                    // 261
  var values = Object.keys(object).map(function (key) {                                                             // 262
    return object[key];                                                                                             // 263
  });                                                                                                               // 264
  if (arguments.length > 1) {                                                                                       // 265
    values.push.apply(values, Array.prototype.slice.call(arguments, 1));                                            // 266
  }                                                                                                                 // 267
  return values;                                                                                                    // 268
}                                                                                                                   // 269
                                                                                                                    // 270
/**                                                                                                                 // 271
 * A thin wrapper around JSON.stringify:                                                                            // 272
 *                                                                                                                  // 273
 *  - `undefined` gets evaluated to "undefined"                                                                     // 274
 *  - a function gets evaluated to source code                                                                      // 275
 *                                                                                                                  // 276
 * @param {Object} value                                                                                            // 277
 */                                                                                                                 // 278
function stringify(value) {                                                                                         // 279
  "use strict";                                                                                                     // 280
                                                                                                                    // 281
  if (typeof value === 'function') {                                                                                // 282
    return value.toString();                                                                                        // 283
  }                                                                                                                 // 284
  return value !== undefined ? JSON.stringify(value) : "undefined";                                                 // 285
}                                                                                                                   // 286
                                                                                                                    // 287
                                                                                                                    // 288
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/anti:gagarin/meteor/createUser.js                                                                       //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
                                                                                                                    // 1
var settings = Meteor.settings.gagarin || {};                                                                       // 2
                                                                                                                    // 3
Meteor.startup(function () {                                                                                        // 4
                                                                                                                    // 5
  if (!Gagarin.isActive) {                                                                                          // 6
    return;                                                                                                         // 7
  }                                                                                                                 // 8
                                                                                                                    // 9
  maybeCreateUser(settings);                                                                                        // 10
});                                                                                                                 // 11
                                                                                                                    // 12
Meteor.startup(function () {                                                                                        // 13
                                                                                                                    // 14
  if (!Gagarin.isActive) {                                                                                          // 15
    return;                                                                                                         // 16
  }                                                                                                                 // 17
                                                                                                                    // 18
  maybeCreateUser(settings);                                                                                        // 19
});                                                                                                                 // 20
                                                                                                                    // 21
function maybeCreateUser (settings) {                                                                               // 22
                                                                                                                    // 23
  var userId = null;                                                                                                // 24
                                                                                                                    // 25
  if (!Package['accounts-password']) {                                                                              // 26
    return;                                                                                                         // 27
  }                                                                                                                 // 28
                                                                                                                    // 29
  if (!settings.username || !settings.password) {                                                                   // 30
    return;                                                                                                         // 31
  }                                                                                                                 // 32
                                                                                                                    // 33
  Meteor.users.remove({ username: settings.username });                                                             // 34
                                                                                                                    // 35
  userId = Accounts.createUser({                                                                                    // 36
    username : settings.username,                                                                                   // 37
    password : settings.password,                                                                                   // 38
  });                                                                                                               // 39
                                                                                                                    // 40
  Meteor.users.update({_id: userId}, { $set: {                                                                      // 41
    gagarin : true                                                                                                  // 42
  }});                                                                                                              // 43
                                                                                                                    // 44
}                                                                                                                   // 45
                                                                                                                    // 46
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['anti:gagarin'] = {
  Gagarin: Gagarin
};

})();

//# sourceMappingURL=anti_gagarin.js.map
