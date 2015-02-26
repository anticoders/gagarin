(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var NpmModuleBcrypt = Package['npm-bcrypt'].NpmModuleBcrypt;
var Accounts = Package['accounts-base'].Accounts;
var SRP = Package.srp.SRP;
var SHA256 = Package.sha.SHA256;
var Email = Package.email.Email;
var Random = Package.random.Random;
var check = Package.check.check;
var Match = Package.check.Match;
var _ = Package.underscore._;
var DDP = Package.ddp.DDP;
var DDPServer = Package.ddp.DDPServer;

(function () {

/////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                         //
// packages/accounts-password/email_templates.js                                           //
//                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////
                                                                                           //
/**                                                                                        // 1
 * @summary Options to customize emails sent from the Accounts system.                     // 2
 * @locus Server                                                                           // 3
 */                                                                                        // 4
Accounts.emailTemplates = {                                                                // 5
  from: "Meteor Accounts <no-reply@meteor.com>",                                           // 6
  siteName: Meteor.absoluteUrl().replace(/^https?:\/\//, '').replace(/\/$/, ''),           // 7
                                                                                           // 8
  resetPassword: {                                                                         // 9
    subject: function(user) {                                                              // 10
      return "How to reset your password on " + Accounts.emailTemplates.siteName;          // 11
    },                                                                                     // 12
    text: function(user, url) {                                                            // 13
      var greeting = (user.profile && user.profile.name) ?                                 // 14
            ("Hello " + user.profile.name + ",") : "Hello,";                               // 15
      return greeting + "\n"                                                               // 16
        + "\n"                                                                             // 17
        + "To reset your password, simply click the link below.\n"                         // 18
        + "\n"                                                                             // 19
        + url + "\n"                                                                       // 20
        + "\n"                                                                             // 21
        + "Thanks.\n";                                                                     // 22
    }                                                                                      // 23
  },                                                                                       // 24
  verifyEmail: {                                                                           // 25
    subject: function(user) {                                                              // 26
      return "How to verify email address on " + Accounts.emailTemplates.siteName;         // 27
    },                                                                                     // 28
    text: function(user, url) {                                                            // 29
      var greeting = (user.profile && user.profile.name) ?                                 // 30
            ("Hello " + user.profile.name + ",") : "Hello,";                               // 31
      return greeting + "\n"                                                               // 32
        + "\n"                                                                             // 33
        + "To verify your account email, simply click the link below.\n"                   // 34
        + "\n"                                                                             // 35
        + url + "\n"                                                                       // 36
        + "\n"                                                                             // 37
        + "Thanks.\n";                                                                     // 38
    }                                                                                      // 39
  },                                                                                       // 40
  enrollAccount: {                                                                         // 41
    subject: function(user) {                                                              // 42
      return "An account has been created for you on " + Accounts.emailTemplates.siteName; // 43
    },                                                                                     // 44
    text: function(user, url) {                                                            // 45
      var greeting = (user.profile && user.profile.name) ?                                 // 46
            ("Hello " + user.profile.name + ",") : "Hello,";                               // 47
      return greeting + "\n"                                                               // 48
        + "\n"                                                                             // 49
        + "To start using the service, simply click the link below.\n"                     // 50
        + "\n"                                                                             // 51
        + url + "\n"                                                                       // 52
        + "\n"                                                                             // 53
        + "Thanks.\n";                                                                     // 54
    }                                                                                      // 55
  }                                                                                        // 56
};                                                                                         // 57
                                                                                           // 58
/////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

/////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                         //
// packages/accounts-password/password_server.js                                           //
//                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////
                                                                                           //
/// BCRYPT                                                                                 // 1
                                                                                           // 2
var bcrypt = NpmModuleBcrypt;                                                              // 3
var bcryptHash = Meteor.wrapAsync(bcrypt.hash);                                            // 4
var bcryptCompare = Meteor.wrapAsync(bcrypt.compare);                                      // 5
                                                                                           // 6
// User records have a 'services.password.bcrypt' field on them to hold                    // 7
// their hashed passwords (unless they have a 'services.password.srp'                      // 8
// field, in which case they will be upgraded to bcrypt the next time                      // 9
// they log in).                                                                           // 10
//                                                                                         // 11
// When the client sends a password to the server, it can either be a                      // 12
// string (the plaintext password) or an object with keys 'digest' and                     // 13
// 'algorithm' (must be "sha-256" for now). The Meteor client always sends                 // 14
// password objects { digest: *, algorithm: "sha-256" }, but DDP clients                   // 15
// that don't have access to SHA can just send plaintext passwords as                      // 16
// strings.                                                                                // 17
//                                                                                         // 18
// When the server receives a plaintext password as a string, it always                    // 19
// hashes it with SHA256 before passing it into bcrypt. When the server                    // 20
// receives a password as an object, it asserts that the algorithm is                      // 21
// "sha-256" and then passes the digest to bcrypt.                                         // 22
                                                                                           // 23
                                                                                           // 24
Accounts._bcryptRounds = 10;                                                               // 25
                                                                                           // 26
// Given a 'password' from the client, extract the string that we should                   // 27
// bcrypt. 'password' can be one of:                                                       // 28
//  - String (the plaintext password)                                                      // 29
//  - Object with 'digest' and 'algorithm' keys. 'algorithm' must be "sha-256".            // 30
//                                                                                         // 31
var getPasswordString = function (password) {                                              // 32
  if (typeof password === "string") {                                                      // 33
    password = SHA256(password);                                                           // 34
  } else { // 'password' is an object                                                      // 35
    if (password.algorithm !== "sha-256") {                                                // 36
      throw new Error("Invalid password hash algorithm. " +                                // 37
                      "Only 'sha-256' is allowed.");                                       // 38
    }                                                                                      // 39
    password = password.digest;                                                            // 40
  }                                                                                        // 41
  return password;                                                                         // 42
};                                                                                         // 43
                                                                                           // 44
// Use bcrypt to hash the password for storage in the database.                            // 45
// `password` can be a string (in which case it will be run through                        // 46
// SHA256 before bcrypt) or an object with properties `digest` and                         // 47
// `algorithm` (in which case we bcrypt `password.digest`).                                // 48
//                                                                                         // 49
var hashPassword = function (password) {                                                   // 50
  password = getPasswordString(password);                                                  // 51
  return bcryptHash(password, Accounts._bcryptRounds);                                     // 52
};                                                                                         // 53
                                                                                           // 54
// Check whether the provided password matches the bcrypt'ed password in                   // 55
// the database user record. `password` can be a string (in which case                     // 56
// it will be run through SHA256 before bcrypt) or an object with                          // 57
// properties `digest` and `algorithm` (in which case we bcrypt                            // 58
// `password.digest`).                                                                     // 59
//                                                                                         // 60
Accounts._checkPassword = function (user, password) {                                      // 61
  var result = {                                                                           // 62
    userId: user._id                                                                       // 63
  };                                                                                       // 64
                                                                                           // 65
  password = getPasswordString(password);                                                  // 66
                                                                                           // 67
  if (! bcryptCompare(password, user.services.password.bcrypt)) {                          // 68
    result.error = new Meteor.Error(403, "Incorrect password");                            // 69
  }                                                                                        // 70
                                                                                           // 71
  return result;                                                                           // 72
};                                                                                         // 73
var checkPassword = Accounts._checkPassword;                                               // 74
                                                                                           // 75
///                                                                                        // 76
/// LOGIN                                                                                  // 77
///                                                                                        // 78
                                                                                           // 79
// Users can specify various keys to identify themselves with.                             // 80
// @param user {Object} with one of `id`, `username`, or `email`.                          // 81
// @returns A selector to pass to mongo to get the user record.                            // 82
                                                                                           // 83
var selectorFromUserQuery = function (user) {                                              // 84
  if (user.id)                                                                             // 85
    return {_id: user.id};                                                                 // 86
  else if (user.username)                                                                  // 87
    return {username: user.username};                                                      // 88
  else if (user.email)                                                                     // 89
    return {"emails.address": user.email};                                                 // 90
  throw new Error("shouldn't happen (validation missed something)");                       // 91
};                                                                                         // 92
                                                                                           // 93
var findUserFromUserQuery = function (user) {                                              // 94
  var selector = selectorFromUserQuery(user);                                              // 95
                                                                                           // 96
  var user = Meteor.users.findOne(selector);                                               // 97
  if (!user)                                                                               // 98
    throw new Meteor.Error(403, "User not found");                                         // 99
                                                                                           // 100
  return user;                                                                             // 101
};                                                                                         // 102
                                                                                           // 103
// XXX maybe this belongs in the check package                                             // 104
var NonEmptyString = Match.Where(function (x) {                                            // 105
  check(x, String);                                                                        // 106
  return x.length > 0;                                                                     // 107
});                                                                                        // 108
                                                                                           // 109
var userQueryValidator = Match.Where(function (user) {                                     // 110
  check(user, {                                                                            // 111
    id: Match.Optional(NonEmptyString),                                                    // 112
    username: Match.Optional(NonEmptyString),                                              // 113
    email: Match.Optional(NonEmptyString)                                                  // 114
  });                                                                                      // 115
  if (_.keys(user).length !== 1)                                                           // 116
    throw new Match.Error("User property must have exactly one field");                    // 117
  return true;                                                                             // 118
});                                                                                        // 119
                                                                                           // 120
var passwordValidator = Match.OneOf(                                                       // 121
  String,                                                                                  // 122
  { digest: String, algorithm: String }                                                    // 123
);                                                                                         // 124
                                                                                           // 125
// Handler to login with a password.                                                       // 126
//                                                                                         // 127
// The Meteor client sets options.password to an object with keys                          // 128
// 'digest' (set to SHA256(password)) and 'algorithm' ("sha-256").                         // 129
//                                                                                         // 130
// For other DDP clients which don't have access to SHA, the handler                       // 131
// also accepts the plaintext password in options.password as a string.                    // 132
//                                                                                         // 133
// (It might be nice if servers could turn the plaintext password                          // 134
// option off. Or maybe it should be opt-in, not opt-out?                                  // 135
// Accounts.config option?)                                                                // 136
//                                                                                         // 137
// Note that neither password option is secure without SSL.                                // 138
//                                                                                         // 139
Accounts.registerLoginHandler("password", function (options) {                             // 140
  if (! options.password || options.srp)                                                   // 141
    return undefined; // don't handle                                                      // 142
                                                                                           // 143
  check(options, {                                                                         // 144
    user: userQueryValidator,                                                              // 145
    password: passwordValidator                                                            // 146
  });                                                                                      // 147
                                                                                           // 148
                                                                                           // 149
  var user = findUserFromUserQuery(options.user);                                          // 150
                                                                                           // 151
  if (!user.services || !user.services.password ||                                         // 152
      !(user.services.password.bcrypt || user.services.password.srp))                      // 153
    throw new Meteor.Error(403, "User has no password set");                               // 154
                                                                                           // 155
  if (!user.services.password.bcrypt) {                                                    // 156
    if (typeof options.password === "string") {                                            // 157
      // The client has presented a plaintext password, and the user is                    // 158
      // not upgraded to bcrypt yet. We don't attempt to tell the client                   // 159
      // to upgrade to bcrypt, because it might be a standalone DDP                        // 160
      // client doesn't know how to do such a thing.                                       // 161
      var verifier = user.services.password.srp;                                           // 162
      var newVerifier = SRP.generateVerifier(options.password, {                           // 163
        identity: verifier.identity, salt: verifier.salt});                                // 164
                                                                                           // 165
      if (verifier.verifier !== newVerifier.verifier) {                                    // 166
        return {                                                                           // 167
          userId: user._id,                                                                // 168
          error: new Meteor.Error(403, "Incorrect password")                               // 169
        };                                                                                 // 170
      }                                                                                    // 171
                                                                                           // 172
      return {userId: user._id};                                                           // 173
    } else {                                                                               // 174
      // Tell the client to use the SRP upgrade process.                                   // 175
      throw new Meteor.Error(400, "old password format", EJSON.stringify({                 // 176
        format: 'srp',                                                                     // 177
        identity: user.services.password.srp.identity                                      // 178
      }));                                                                                 // 179
    }                                                                                      // 180
  }                                                                                        // 181
                                                                                           // 182
  return checkPassword(                                                                    // 183
    user,                                                                                  // 184
    options.password                                                                       // 185
  );                                                                                       // 186
});                                                                                        // 187
                                                                                           // 188
// Handler to login using the SRP upgrade path. To use this login                          // 189
// handler, the client must provide:                                                       // 190
//   - srp: H(identity + ":" + password)                                                   // 191
//   - password: a string or an object with properties 'digest' and 'algorithm'            // 192
//                                                                                         // 193
// We use `options.srp` to verify that the client knows the correct                        // 194
// password without doing a full SRP flow. Once we've checked that, we                     // 195
// upgrade the user to bcrypt and remove the SRP information from the                      // 196
// user document.                                                                          // 197
//                                                                                         // 198
// The client ends up using this login handler after trying the normal                     // 199
// login handler (above), which throws an error telling the client to                      // 200
// try the SRP upgrade path.                                                               // 201
//                                                                                         // 202
// XXX COMPAT WITH 0.8.1.3                                                                 // 203
Accounts.registerLoginHandler("password", function (options) {                             // 204
  if (!options.srp || !options.password)                                                   // 205
    return undefined; // don't handle                                                      // 206
                                                                                           // 207
  check(options, {                                                                         // 208
    user: userQueryValidator,                                                              // 209
    srp: String,                                                                           // 210
    password: passwordValidator                                                            // 211
  });                                                                                      // 212
                                                                                           // 213
  var user = findUserFromUserQuery(options.user);                                          // 214
                                                                                           // 215
  // Check to see if another simultaneous login has already upgraded                       // 216
  // the user record to bcrypt.                                                            // 217
  if (user.services && user.services.password && user.services.password.bcrypt)            // 218
    return checkPassword(user, options.password);                                          // 219
                                                                                           // 220
  if (!(user.services && user.services.password && user.services.password.srp))            // 221
    throw new Meteor.Error(403, "User has no password set");                               // 222
                                                                                           // 223
  var v1 = user.services.password.srp.verifier;                                            // 224
  var v2 = SRP.generateVerifier(                                                           // 225
    null,                                                                                  // 226
    {                                                                                      // 227
      hashedIdentityAndPassword: options.srp,                                              // 228
      salt: user.services.password.srp.salt                                                // 229
    }                                                                                      // 230
  ).verifier;                                                                              // 231
  if (v1 !== v2)                                                                           // 232
    return {                                                                               // 233
      userId: user._id,                                                                    // 234
      error: new Meteor.Error(403, "Incorrect password")                                   // 235
    };                                                                                     // 236
                                                                                           // 237
  // Upgrade to bcrypt on successful login.                                                // 238
  var salted = hashPassword(options.password);                                             // 239
  Meteor.users.update(                                                                     // 240
    user._id,                                                                              // 241
    {                                                                                      // 242
      $unset: { 'services.password.srp': 1 },                                              // 243
      $set: { 'services.password.bcrypt': salted }                                         // 244
    }                                                                                      // 245
  );                                                                                       // 246
                                                                                           // 247
  return {userId: user._id};                                                               // 248
});                                                                                        // 249
                                                                                           // 250
                                                                                           // 251
///                                                                                        // 252
/// CHANGING                                                                               // 253
///                                                                                        // 254
                                                                                           // 255
// Let the user change their own password if they know the old                             // 256
// password. `oldPassword` and `newPassword` should be objects with keys                   // 257
// `digest` and `algorithm` (representing the SHA256 of the password).                     // 258
//                                                                                         // 259
// XXX COMPAT WITH 0.8.1.3                                                                 // 260
// Like the login method, if the user hasn't been upgraded from SRP to                     // 261
// bcrypt yet, then this method will throw an 'old password format'                        // 262
// error. The client should call the SRP upgrade login handler and then                    // 263
// retry this method again.                                                                // 264
//                                                                                         // 265
// UNLIKE the login method, there is no way to avoid getting SRP upgrade                   // 266
// errors thrown. The reasoning for this is that clients using this                        // 267
// method directly will need to be updated anyway because we no longer                     // 268
// support the SRP flow that they would have been doing to use this                        // 269
// method previously.                                                                      // 270
Meteor.methods({changePassword: function (oldPassword, newPassword) {                      // 271
  check(oldPassword, passwordValidator);                                                   // 272
  check(newPassword, passwordValidator);                                                   // 273
                                                                                           // 274
  if (!this.userId)                                                                        // 275
    throw new Meteor.Error(401, "Must be logged in");                                      // 276
                                                                                           // 277
  var user = Meteor.users.findOne(this.userId);                                            // 278
  if (!user)                                                                               // 279
    throw new Meteor.Error(403, "User not found");                                         // 280
                                                                                           // 281
  if (!user.services || !user.services.password ||                                         // 282
      (!user.services.password.bcrypt && !user.services.password.srp))                     // 283
    throw new Meteor.Error(403, "User has no password set");                               // 284
                                                                                           // 285
  if (! user.services.password.bcrypt) {                                                   // 286
    throw new Meteor.Error(400, "old password format", EJSON.stringify({                   // 287
      format: 'srp',                                                                       // 288
      identity: user.services.password.srp.identity                                        // 289
    }));                                                                                   // 290
  }                                                                                        // 291
                                                                                           // 292
  var result = checkPassword(user, oldPassword);                                           // 293
  if (result.error)                                                                        // 294
    throw result.error;                                                                    // 295
                                                                                           // 296
  var hashed = hashPassword(newPassword);                                                  // 297
                                                                                           // 298
  // It would be better if this removed ALL existing tokens and replaced                   // 299
  // the token for the current connection with a new one, but that would                   // 300
  // be tricky, so we'll settle for just replacing all tokens other than                   // 301
  // the one for the current connection.                                                   // 302
  var currentToken = Accounts._getLoginToken(this.connection.id);                          // 303
  Meteor.users.update(                                                                     // 304
    { _id: this.userId },                                                                  // 305
    {                                                                                      // 306
      $set: { 'services.password.bcrypt': hashed },                                        // 307
      $pull: {                                                                             // 308
        'services.resume.loginTokens': { hashedToken: { $ne: currentToken } }              // 309
      },                                                                                   // 310
      $unset: { 'services.password.reset': 1 }                                             // 311
    }                                                                                      // 312
  );                                                                                       // 313
                                                                                           // 314
  return {passwordChanged: true};                                                          // 315
}});                                                                                       // 316
                                                                                           // 317
                                                                                           // 318
// Force change the users password.                                                        // 319
                                                                                           // 320
/**                                                                                        // 321
 * @summary Forcibly change the password for a user.                                       // 322
 * @locus Server                                                                           // 323
 * @param {String} userId The id of the user to update.                                    // 324
 * @param {String} newPassword A new password for the user.                                // 325
 */                                                                                        // 326
Accounts.setPassword = function (userId, newPlaintextPassword) {                           // 327
  var user = Meteor.users.findOne(userId);                                                 // 328
  if (!user)                                                                               // 329
    throw new Meteor.Error(403, "User not found");                                         // 330
                                                                                           // 331
  Meteor.users.update(                                                                     // 332
    {_id: user._id},                                                                       // 333
    {                                                                                      // 334
      $unset: {                                                                            // 335
        'services.password.srp': 1, // XXX COMPAT WITH 0.8.1.3                             // 336
        'services.password.reset': 1,                                                      // 337
        'services.resume.loginTokens': 1                                                   // 338
      },                                                                                   // 339
      $set: {'services.password.bcrypt': hashPassword(newPlaintextPassword)} }             // 340
  );                                                                                       // 341
};                                                                                         // 342
                                                                                           // 343
                                                                                           // 344
///                                                                                        // 345
/// RESETTING VIA EMAIL                                                                    // 346
///                                                                                        // 347
                                                                                           // 348
// Method called by a user to request a password reset email. This is                      // 349
// the start of the reset process.                                                         // 350
Meteor.methods({forgotPassword: function (options) {                                       // 351
  check(options, {email: String});                                                         // 352
                                                                                           // 353
  var user = Meteor.users.findOne({"emails.address": options.email});                      // 354
  if (!user)                                                                               // 355
    throw new Meteor.Error(403, "User not found");                                         // 356
                                                                                           // 357
  Accounts.sendResetPasswordEmail(user._id, options.email);                                // 358
}});                                                                                       // 359
                                                                                           // 360
// send the user an email with a link that when opened allows the user                     // 361
// to set a new password, without the old password.                                        // 362
                                                                                           // 363
/**                                                                                        // 364
 * @summary Send an email with a link the user can use to reset their password.            // 365
 * @locus Server                                                                           // 366
 * @param {String} userId The id of the user to send email to.                             // 367
 * @param {String} [email] Optional. Which address of the user's to send the email to. This address must be in the user's `emails` list. Defaults to the first email in the list.
 */                                                                                        // 369
Accounts.sendResetPasswordEmail = function (userId, email) {                               // 370
  // Make sure the user exists, and email is one of their addresses.                       // 371
  var user = Meteor.users.findOne(userId);                                                 // 372
  if (!user)                                                                               // 373
    throw new Error("Can't find user");                                                    // 374
  // pick the first email if we weren't passed an email.                                   // 375
  if (!email && user.emails && user.emails[0])                                             // 376
    email = user.emails[0].address;                                                        // 377
  // make sure we have a valid email                                                       // 378
  if (!email || !_.contains(_.pluck(user.emails || [], 'address'), email))                 // 379
    throw new Error("No such email for user.");                                            // 380
                                                                                           // 381
  var token = Random.secret();                                                             // 382
  var when = new Date();                                                                   // 383
  var tokenRecord = {                                                                      // 384
    token: token,                                                                          // 385
    email: email,                                                                          // 386
    when: when                                                                             // 387
  };                                                                                       // 388
  Meteor.users.update(userId, {$set: {                                                     // 389
    "services.password.reset": tokenRecord                                                 // 390
  }});                                                                                     // 391
  // before passing to template, update user object with new token                         // 392
  Meteor._ensure(user, 'services', 'password').reset = tokenRecord;                        // 393
                                                                                           // 394
  var resetPasswordUrl = Accounts.urls.resetPassword(token);                               // 395
                                                                                           // 396
  var options = {                                                                          // 397
    to: email,                                                                             // 398
    from: Accounts.emailTemplates.from,                                                    // 399
    subject: Accounts.emailTemplates.resetPassword.subject(user),                          // 400
    text: Accounts.emailTemplates.resetPassword.text(user, resetPasswordUrl)               // 401
  };                                                                                       // 402
                                                                                           // 403
  if (typeof Accounts.emailTemplates.resetPassword.html === 'function')                    // 404
    options.html =                                                                         // 405
      Accounts.emailTemplates.resetPassword.html(user, resetPasswordUrl);                  // 406
                                                                                           // 407
  Email.send(options);                                                                     // 408
};                                                                                         // 409
                                                                                           // 410
// send the user an email informing them that their account was created, with              // 411
// a link that when opened both marks their email as verified and forces them              // 412
// to choose their password. The email must be one of the addresses in the                 // 413
// user's emails field, or undefined to pick the first email automatically.                // 414
//                                                                                         // 415
// This is not called automatically. It must be called manually if you                     // 416
// want to use enrollment emails.                                                          // 417
                                                                                           // 418
/**                                                                                        // 419
 * @summary Send an email with a link the user can use to set their initial password.      // 420
 * @locus Server                                                                           // 421
 * @param {String} userId The id of the user to send email to.                             // 422
 * @param {String} [email] Optional. Which address of the user's to send the email to. This address must be in the user's `emails` list. Defaults to the first email in the list.
 */                                                                                        // 424
Accounts.sendEnrollmentEmail = function (userId, email) {                                  // 425
  // XXX refactor! This is basically identical to sendResetPasswordEmail.                  // 426
                                                                                           // 427
  // Make sure the user exists, and email is in their addresses.                           // 428
  var user = Meteor.users.findOne(userId);                                                 // 429
  if (!user)                                                                               // 430
    throw new Error("Can't find user");                                                    // 431
  // pick the first email if we weren't passed an email.                                   // 432
  if (!email && user.emails && user.emails[0])                                             // 433
    email = user.emails[0].address;                                                        // 434
  // make sure we have a valid email                                                       // 435
  if (!email || !_.contains(_.pluck(user.emails || [], 'address'), email))                 // 436
    throw new Error("No such email for user.");                                            // 437
                                                                                           // 438
  var token = Random.secret();                                                             // 439
  var when = new Date();                                                                   // 440
  var tokenRecord = {                                                                      // 441
    token: token,                                                                          // 442
    email: email,                                                                          // 443
    when: when                                                                             // 444
  };                                                                                       // 445
  Meteor.users.update(userId, {$set: {                                                     // 446
    "services.password.reset": tokenRecord                                                 // 447
  }});                                                                                     // 448
                                                                                           // 449
  // before passing to template, update user object with new token                         // 450
  Meteor._ensure(user, 'services', 'password').reset = tokenRecord;                        // 451
                                                                                           // 452
  var enrollAccountUrl = Accounts.urls.enrollAccount(token);                               // 453
                                                                                           // 454
  var options = {                                                                          // 455
    to: email,                                                                             // 456
    from: Accounts.emailTemplates.from,                                                    // 457
    subject: Accounts.emailTemplates.enrollAccount.subject(user),                          // 458
    text: Accounts.emailTemplates.enrollAccount.text(user, enrollAccountUrl)               // 459
  };                                                                                       // 460
                                                                                           // 461
  if (typeof Accounts.emailTemplates.enrollAccount.html === 'function')                    // 462
    options.html =                                                                         // 463
      Accounts.emailTemplates.enrollAccount.html(user, enrollAccountUrl);                  // 464
                                                                                           // 465
  Email.send(options);                                                                     // 466
};                                                                                         // 467
                                                                                           // 468
                                                                                           // 469
// Take token from sendResetPasswordEmail or sendEnrollmentEmail, change                   // 470
// the users password, and log them in.                                                    // 471
Meteor.methods({resetPassword: function (token, newPassword) {                             // 472
  var self = this;                                                                         // 473
  return Accounts._loginMethod(                                                            // 474
    self,                                                                                  // 475
    "resetPassword",                                                                       // 476
    arguments,                                                                             // 477
    "password",                                                                            // 478
    function () {                                                                          // 479
      check(token, String);                                                                // 480
      check(newPassword, passwordValidator);                                               // 481
                                                                                           // 482
      var user = Meteor.users.findOne({                                                    // 483
        "services.password.reset.token": token});                                          // 484
      if (!user)                                                                           // 485
        throw new Meteor.Error(403, "Token expired");                                      // 486
      var email = user.services.password.reset.email;                                      // 487
      if (!_.include(_.pluck(user.emails || [], 'address'), email))                        // 488
        return {                                                                           // 489
          userId: user._id,                                                                // 490
          error: new Meteor.Error(403, "Token has invalid email address")                  // 491
        };                                                                                 // 492
                                                                                           // 493
      var hashed = hashPassword(newPassword);                                              // 494
                                                                                           // 495
      // NOTE: We're about to invalidate tokens on the user, who we might be               // 496
      // logged in as. Make sure to avoid logging ourselves out if this                    // 497
      // happens. But also make sure not to leave the connection in a state                // 498
      // of having a bad token set if things fail.                                         // 499
      var oldToken = Accounts._getLoginToken(self.connection.id);                          // 500
      Accounts._setLoginToken(user._id, self.connection, null);                            // 501
      var resetToOldToken = function () {                                                  // 502
        Accounts._setLoginToken(user._id, self.connection, oldToken);                      // 503
      };                                                                                   // 504
                                                                                           // 505
      try {                                                                                // 506
        // Update the user record by:                                                      // 507
        // - Changing the password to the new one                                          // 508
        // - Forgetting about the reset token that was just used                           // 509
        // - Verifying their email, since they got the password reset via email.           // 510
        var affectedRecords = Meteor.users.update(                                         // 511
          {                                                                                // 512
            _id: user._id,                                                                 // 513
            'emails.address': email,                                                       // 514
            'services.password.reset.token': token                                         // 515
          },                                                                               // 516
          {$set: {'services.password.bcrypt': hashed,                                      // 517
                  'emails.$.verified': true},                                              // 518
           $unset: {'services.password.reset': 1,                                          // 519
                    'services.password.srp': 1}});                                         // 520
        if (affectedRecords !== 1)                                                         // 521
          return {                                                                         // 522
            userId: user._id,                                                              // 523
            error: new Meteor.Error(403, "Invalid email")                                  // 524
          };                                                                               // 525
      } catch (err) {                                                                      // 526
        resetToOldToken();                                                                 // 527
        throw err;                                                                         // 528
      }                                                                                    // 529
                                                                                           // 530
      // Replace all valid login tokens with new ones (changing                            // 531
      // password should invalidate existing sessions).                                    // 532
      Accounts._clearAllLoginTokens(user._id);                                             // 533
                                                                                           // 534
      return {userId: user._id};                                                           // 535
    }                                                                                      // 536
  );                                                                                       // 537
}});                                                                                       // 538
                                                                                           // 539
///                                                                                        // 540
/// EMAIL VERIFICATION                                                                     // 541
///                                                                                        // 542
                                                                                           // 543
                                                                                           // 544
// send the user an email with a link that when opened marks that                          // 545
// address as verified                                                                     // 546
                                                                                           // 547
/**                                                                                        // 548
 * @summary Send an email with a link the user can use verify their email address.         // 549
 * @locus Server                                                                           // 550
 * @param {String} userId The id of the user to send email to.                             // 551
 * @param {String} [email] Optional. Which address of the user's to send the email to. This address must be in the user's `emails` list. Defaults to the first unverified email in the list.
 */                                                                                        // 553
Accounts.sendVerificationEmail = function (userId, address) {                              // 554
  // XXX Also generate a link using which someone can delete this                          // 555
  // account if they own said address but weren't those who created                        // 556
  // this account.                                                                         // 557
                                                                                           // 558
  // Make sure the user exists, and address is one of their addresses.                     // 559
  var user = Meteor.users.findOne(userId);                                                 // 560
  if (!user)                                                                               // 561
    throw new Error("Can't find user");                                                    // 562
  // pick the first unverified address if we weren't passed an address.                    // 563
  if (!address) {                                                                          // 564
    var email = _.find(user.emails || [],                                                  // 565
                       function (e) { return !e.verified; });                              // 566
    address = (email || {}).address;                                                       // 567
  }                                                                                        // 568
  // make sure we have a valid address                                                     // 569
  if (!address || !_.contains(_.pluck(user.emails || [], 'address'), address))             // 570
    throw new Error("No such email address for user.");                                    // 571
                                                                                           // 572
                                                                                           // 573
  var tokenRecord = {                                                                      // 574
    token: Random.secret(),                                                                // 575
    address: address,                                                                      // 576
    when: new Date()};                                                                     // 577
  Meteor.users.update(                                                                     // 578
    {_id: userId},                                                                         // 579
    {$push: {'services.email.verificationTokens': tokenRecord}});                          // 580
                                                                                           // 581
  // before passing to template, update user object with new token                         // 582
  Meteor._ensure(user, 'services', 'email');                                               // 583
  if (!user.services.email.verificationTokens) {                                           // 584
    user.services.email.verificationTokens = [];                                           // 585
  }                                                                                        // 586
  user.services.email.verificationTokens.push(tokenRecord);                                // 587
                                                                                           // 588
  var verifyEmailUrl = Accounts.urls.verifyEmail(tokenRecord.token);                       // 589
                                                                                           // 590
  var options = {                                                                          // 591
    to: address,                                                                           // 592
    from: Accounts.emailTemplates.from,                                                    // 593
    subject: Accounts.emailTemplates.verifyEmail.subject(user),                            // 594
    text: Accounts.emailTemplates.verifyEmail.text(user, verifyEmailUrl)                   // 595
  };                                                                                       // 596
                                                                                           // 597
  if (typeof Accounts.emailTemplates.verifyEmail.html === 'function')                      // 598
    options.html =                                                                         // 599
      Accounts.emailTemplates.verifyEmail.html(user, verifyEmailUrl);                      // 600
                                                                                           // 601
  Email.send(options);                                                                     // 602
};                                                                                         // 603
                                                                                           // 604
// Take token from sendVerificationEmail, mark the email as verified,                      // 605
// and log them in.                                                                        // 606
Meteor.methods({verifyEmail: function (token) {                                            // 607
  var self = this;                                                                         // 608
  return Accounts._loginMethod(                                                            // 609
    self,                                                                                  // 610
    "verifyEmail",                                                                         // 611
    arguments,                                                                             // 612
    "password",                                                                            // 613
    function () {                                                                          // 614
      check(token, String);                                                                // 615
                                                                                           // 616
      var user = Meteor.users.findOne(                                                     // 617
        {'services.email.verificationTokens.token': token});                               // 618
      if (!user)                                                                           // 619
        throw new Meteor.Error(403, "Verify email link expired");                          // 620
                                                                                           // 621
      var tokenRecord = _.find(user.services.email.verificationTokens,                     // 622
                               function (t) {                                              // 623
                                 return t.token == token;                                  // 624
                               });                                                         // 625
      if (!tokenRecord)                                                                    // 626
        return {                                                                           // 627
          userId: user._id,                                                                // 628
          error: new Meteor.Error(403, "Verify email link expired")                        // 629
        };                                                                                 // 630
                                                                                           // 631
      var emailsRecord = _.find(user.emails, function (e) {                                // 632
        return e.address == tokenRecord.address;                                           // 633
      });                                                                                  // 634
      if (!emailsRecord)                                                                   // 635
        return {                                                                           // 636
          userId: user._id,                                                                // 637
          error: new Meteor.Error(403, "Verify email link is for unknown address")         // 638
        };                                                                                 // 639
                                                                                           // 640
      // By including the address in the query, we can use 'emails.$' in the               // 641
      // modifier to get a reference to the specific object in the emails                  // 642
      // array. See                                                                        // 643
      // http://www.mongodb.org/display/DOCS/Updating/#Updating-The%24positionaloperator)  // 644
      // http://www.mongodb.org/display/DOCS/Updating#Updating-%24pull                     // 645
      Meteor.users.update(                                                                 // 646
        {_id: user._id,                                                                    // 647
         'emails.address': tokenRecord.address},                                           // 648
        {$set: {'emails.$.verified': true},                                                // 649
         $pull: {'services.email.verificationTokens': {token: token}}});                   // 650
                                                                                           // 651
      return {userId: user._id};                                                           // 652
    }                                                                                      // 653
  );                                                                                       // 654
}});                                                                                       // 655
                                                                                           // 656
                                                                                           // 657
                                                                                           // 658
///                                                                                        // 659
/// CREATING USERS                                                                         // 660
///                                                                                        // 661
                                                                                           // 662
// Shared createUser function called from the createUser method, both                      // 663
// if originates in client or server code. Calls user provided hooks,                      // 664
// does the actual user insertion.                                                         // 665
//                                                                                         // 666
// returns the user id                                                                     // 667
var createUser = function (options) {                                                      // 668
  // Unknown keys allowed, because a onCreateUserHook can take arbitrary                   // 669
  // options.                                                                              // 670
  check(options, Match.ObjectIncluding({                                                   // 671
    username: Match.Optional(String),                                                      // 672
    email: Match.Optional(String),                                                         // 673
    password: Match.Optional(passwordValidator)                                            // 674
  }));                                                                                     // 675
                                                                                           // 676
  var username = options.username;                                                         // 677
  var email = options.email;                                                               // 678
  if (!username && !email)                                                                 // 679
    throw new Meteor.Error(400, "Need to set a username or email");                        // 680
                                                                                           // 681
  var user = {services: {}};                                                               // 682
  if (options.password) {                                                                  // 683
    var hashed = hashPassword(options.password);                                           // 684
    user.services.password = { bcrypt: hashed };                                           // 685
  }                                                                                        // 686
                                                                                           // 687
  if (username)                                                                            // 688
    user.username = username;                                                              // 689
  if (email)                                                                               // 690
    user.emails = [{address: email, verified: false}];                                     // 691
                                                                                           // 692
  return Accounts.insertUserDoc(options, user);                                            // 693
};                                                                                         // 694
                                                                                           // 695
// method for create user. Requests come from the client.                                  // 696
Meteor.methods({createUser: function (options) {                                           // 697
  var self = this;                                                                         // 698
  return Accounts._loginMethod(                                                            // 699
    self,                                                                                  // 700
    "createUser",                                                                          // 701
    arguments,                                                                             // 702
    "password",                                                                            // 703
    function () {                                                                          // 704
      // createUser() above does more checking.                                            // 705
      check(options, Object);                                                              // 706
      if (Accounts._options.forbidClientAccountCreation)                                   // 707
        return {                                                                           // 708
          error: new Meteor.Error(403, "Signups forbidden")                                // 709
        };                                                                                 // 710
                                                                                           // 711
      // Create user. result contains id and token.                                        // 712
      var userId = createUser(options);                                                    // 713
      // safety belt. createUser is supposed to throw on error. send 500 error             // 714
      // instead of sending a verification email with empty userid.                        // 715
      if (! userId)                                                                        // 716
        throw new Error("createUser failed to insert new user");                           // 717
                                                                                           // 718
      // If `Accounts._options.sendVerificationEmail` is set, register                     // 719
      // a token to verify the user's primary email, and send it to                        // 720
      // that address.                                                                     // 721
      if (options.email && Accounts._options.sendVerificationEmail)                        // 722
        Accounts.sendVerificationEmail(userId, options.email);                             // 723
                                                                                           // 724
      // client gets logged in as the new user afterwards.                                 // 725
      return {userId: userId};                                                             // 726
    }                                                                                      // 727
  );                                                                                       // 728
}});                                                                                       // 729
                                                                                           // 730
// Create user directly on the server.                                                     // 731
//                                                                                         // 732
// Unlike the client version, this does not log you in as this user                        // 733
// after creation.                                                                         // 734
//                                                                                         // 735
// returns userId or throws an error if it can't create                                    // 736
//                                                                                         // 737
// XXX add another argument ("server options") that gets sent to onCreateUser,             // 738
// which is always empty when called from the createUser method? eg, "admin:               // 739
// true", which we want to prevent the client from setting, but which a custom             // 740
// method calling Accounts.createUser could set?                                           // 741
//                                                                                         // 742
Accounts.createUser = function (options, callback) {                                       // 743
  options = _.clone(options);                                                              // 744
                                                                                           // 745
  // XXX allow an optional callback?                                                       // 746
  if (callback) {                                                                          // 747
    throw new Error("Accounts.createUser with callback not supported on the server yet."); // 748
  }                                                                                        // 749
                                                                                           // 750
  return createUser(options);                                                              // 751
};                                                                                         // 752
                                                                                           // 753
///                                                                                        // 754
/// PASSWORD-SPECIFIC INDEXES ON USERS                                                     // 755
///                                                                                        // 756
Meteor.users._ensureIndex('emails.validationTokens.token',                                 // 757
                          {unique: 1, sparse: 1});                                         // 758
Meteor.users._ensureIndex('services.password.reset.token',                                 // 759
                          {unique: 1, sparse: 1});                                         // 760
                                                                                           // 761
/////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['accounts-password'] = {};

})();

//# sourceMappingURL=accounts-password.js.map
