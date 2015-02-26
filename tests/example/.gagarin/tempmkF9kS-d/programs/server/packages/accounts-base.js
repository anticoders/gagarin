(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var _ = Package.underscore._;
var check = Package.check.check;
var Match = Package.check.Match;
var Random = Package.random.Random;
var EJSON = Package.ejson.EJSON;
var Hook = Package['callback-hook'].Hook;
var DDP = Package.ddp.DDP;
var DDPServer = Package.ddp.DDPServer;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;

/* Package-scope variables */
var Accounts, AccountsTest, EXPIRE_TOKENS_INTERVAL_MS, CONNECTION_CLOSE_DELAY_MS, getTokenLifetimeMs, maybeStopExpireTokensInterval;

(function () {

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/accounts-base/accounts_common.js                                                                     //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
/**                                                                                                              // 1
 * @namespace Accounts                                                                                           // 2
 * @summary The namespace for all accounts-related methods.                                                      // 3
 */                                                                                                              // 4
Accounts = {};                                                                                                   // 5
                                                                                                                 // 6
// Currently this is read directly by packages like accounts-password                                            // 7
// and accounts-ui-unstyled.                                                                                     // 8
Accounts._options = {};                                                                                          // 9
                                                                                                                 // 10
// how long (in days) until a login token expires                                                                // 11
var DEFAULT_LOGIN_EXPIRATION_DAYS = 90;                                                                          // 12
// Clients don't try to auto-login with a token that is going to expire within                                   // 13
// .1 * DEFAULT_LOGIN_EXPIRATION_DAYS, capped at MIN_TOKEN_LIFETIME_CAP_SECS.                                    // 14
// Tries to avoid abrupt disconnects from expiring tokens.                                                       // 15
var MIN_TOKEN_LIFETIME_CAP_SECS = 3600; // one hour                                                              // 16
// how often (in milliseconds) we check for expired tokens                                                       // 17
EXPIRE_TOKENS_INTERVAL_MS = 600 * 1000; // 10 minutes                                                            // 18
// how long we wait before logging out clients when Meteor.logoutOtherClients is                                 // 19
// called                                                                                                        // 20
CONNECTION_CLOSE_DELAY_MS = 10 * 1000;                                                                           // 21
                                                                                                                 // 22
// Set up config for the accounts system. Call this on both the client                                           // 23
// and the server.                                                                                               // 24
//                                                                                                               // 25
// XXX we should add some enforcement that this is called on both the                                            // 26
// client and the server. Otherwise, a user can                                                                  // 27
// 'forbidClientAccountCreation' only on the client and while it looks                                           // 28
// like their app is secure, the server will still accept createUser                                             // 29
// calls. https://github.com/meteor/meteor/issues/828                                                            // 30
//                                                                                                               // 31
// @param options {Object} an object with fields:                                                                // 32
// - sendVerificationEmail {Boolean}                                                                             // 33
//     Send email address verification emails to new users created from                                          // 34
//     client signups.                                                                                           // 35
// - forbidClientAccountCreation {Boolean}                                                                       // 36
//     Do not allow clients to create accounts directly.                                                         // 37
// - restrictCreationByEmailDomain {Function or String}                                                          // 38
//     Require created users to have an email matching the function or                                           // 39
//     having the string as domain.                                                                              // 40
// - loginExpirationInDays {Number}                                                                              // 41
//     Number of days since login until a user is logged out (login token                                        // 42
//     expires).                                                                                                 // 43
                                                                                                                 // 44
/**                                                                                                              // 45
 * @summary Set global accounts options.                                                                         // 46
 * @locus Anywhere                                                                                               // 47
 * @param {Object} options                                                                                       // 48
 * @param {Boolean} options.sendVerificationEmail New users with an email address will receive an address verification email.
 * @param {Boolean} options.forbidClientAccountCreation Calls to [`createUser`](#accounts_createuser) from the client will be rejected. In addition, if you are using [accounts-ui](#accountsui), the "Create account" link will not be available.
 * @param {String | Function} options.restrictCreationByEmailDomain If set to a string, only allows new users if the domain part of their email address matches the string. If set to a function, only allows new users if the function returns true.  The function is passed the full email address of the proposed new user.  Works with password-based sign-in and external services that expose email addresses (Google, Facebook, GitHub). All existing users still can log in after enabling this option. Example: `Accounts.config({ restrictCreationByEmailDomain: 'school.edu' })`.
 * @param {Number} options.loginExpirationInDays The number of days from when a user logs in until their token expires and they are logged out. Defaults to 90. Set to `null` to disable login expiration.
 * @param {String} options.oauthSecretKey When using the `oauth-encryption` package, the 16 byte key using to encrypt sensitive account credentials in the database, encoded in base64.  This option may only be specifed on the server.  See packages/oauth-encryption/README.md for details.
 */                                                                                                              // 54
Accounts.config = function(options) {                                                                            // 55
  // We don't want users to accidentally only call Accounts.config on the                                        // 56
  // client, where some of the options will have partial effects (eg removing                                    // 57
  // the "create account" button from accounts-ui if forbidClientAccountCreation                                 // 58
  // is set, or redirecting Google login to a specific-domain page) without                                      // 59
  // having their full effects.                                                                                  // 60
  if (Meteor.isServer) {                                                                                         // 61
    __meteor_runtime_config__.accountsConfigCalled = true;                                                       // 62
  } else if (!__meteor_runtime_config__.accountsConfigCalled) {                                                  // 63
    // XXX would be nice to "crash" the client and replace the UI with an error                                  // 64
    // message, but there's no trivial way to do this.                                                           // 65
    Meteor._debug("Accounts.config was called on the client but not on the " +                                   // 66
                  "server; some configuration options may not take effect.");                                    // 67
  }                                                                                                              // 68
                                                                                                                 // 69
  // We need to validate the oauthSecretKey option at the time                                                   // 70
  // Accounts.config is called. We also deliberately don't store the                                             // 71
  // oauthSecretKey in Accounts._options.                                                                        // 72
  if (_.has(options, "oauthSecretKey")) {                                                                        // 73
    if (Meteor.isClient)                                                                                         // 74
      throw new Error("The oauthSecretKey option may only be specified on the server");                          // 75
    if (! Package["oauth-encryption"])                                                                           // 76
      throw new Error("The oauth-encryption package must be loaded to set oauthSecretKey");                      // 77
    Package["oauth-encryption"].OAuthEncryption.loadKey(options.oauthSecretKey);                                 // 78
    options = _.omit(options, "oauthSecretKey");                                                                 // 79
  }                                                                                                              // 80
                                                                                                                 // 81
  // validate option keys                                                                                        // 82
  var VALID_KEYS = ["sendVerificationEmail", "forbidClientAccountCreation",                                      // 83
                    "restrictCreationByEmailDomain", "loginExpirationInDays"];                                   // 84
  _.each(_.keys(options), function (key) {                                                                       // 85
    if (!_.contains(VALID_KEYS, key)) {                                                                          // 86
      throw new Error("Accounts.config: Invalid key: " + key);                                                   // 87
    }                                                                                                            // 88
  });                                                                                                            // 89
                                                                                                                 // 90
  // set values in Accounts._options                                                                             // 91
  _.each(VALID_KEYS, function (key) {                                                                            // 92
    if (key in options) {                                                                                        // 93
      if (key in Accounts._options) {                                                                            // 94
        throw new Error("Can't set `" + key + "` more than once");                                               // 95
      } else {                                                                                                   // 96
        Accounts._options[key] = options[key];                                                                   // 97
      }                                                                                                          // 98
    }                                                                                                            // 99
  });                                                                                                            // 100
                                                                                                                 // 101
  // If the user set loginExpirationInDays to null, then we need to clear the                                    // 102
  // timer that periodically expires tokens.                                                                     // 103
  if (Meteor.isServer)                                                                                           // 104
    maybeStopExpireTokensInterval();                                                                             // 105
};                                                                                                               // 106
                                                                                                                 // 107
if (Meteor.isClient) {                                                                                           // 108
  // The connection used by the Accounts system. This is the connection                                          // 109
  // that will get logged in by Meteor.login(), and this is the                                                  // 110
  // connection whose login state will be reflected by Meteor.userId().                                          // 111
  //                                                                                                             // 112
  // It would be much preferable for this to be in accounts_client.js,                                           // 113
  // but it has to be here because it's needed to create the                                                     // 114
  // Meteor.users collection.                                                                                    // 115
  Accounts.connection = Meteor.connection;                                                                       // 116
                                                                                                                 // 117
  if (typeof __meteor_runtime_config__ !== "undefined" &&                                                        // 118
      __meteor_runtime_config__.ACCOUNTS_CONNECTION_URL) {                                                       // 119
    // Temporary, internal hook to allow the server to point the client                                          // 120
    // to a different authentication server. This is for a very                                                  // 121
    // particular use case that comes up when implementing a oauth                                               // 122
    // server. Unsupported and may go away at any point in time.                                                 // 123
    //                                                                                                           // 124
    // We will eventually provide a general way to use account-base                                              // 125
    // against any DDP connection, not just one special one.                                                     // 126
    Accounts.connection = DDP.connect(                                                                           // 127
      __meteor_runtime_config__.ACCOUNTS_CONNECTION_URL)                                                         // 128
  }                                                                                                              // 129
}                                                                                                                // 130
                                                                                                                 // 131
// Users table. Don't use the normal autopublish, since we want to hide                                          // 132
// some fields. Code to autopublish this is in accounts_server.js.                                               // 133
// XXX Allow users to configure this collection name.                                                            // 134
                                                                                                                 // 135
/**                                                                                                              // 136
 * @summary A [Mongo.Collection](#collections) containing user documents.                                        // 137
 * @locus Anywhere                                                                                               // 138
 * @type {Mongo.Collection}                                                                                      // 139
 */                                                                                                              // 140
Meteor.users = new Mongo.Collection("users", {                                                                   // 141
  _preventAutopublish: true,                                                                                     // 142
  connection: Meteor.isClient ? Accounts.connection : Meteor.connection                                          // 143
});                                                                                                              // 144
// There is an allow call in accounts_server that restricts this                                                 // 145
// collection.                                                                                                   // 146
                                                                                                                 // 147
// loginServiceConfiguration and ConfigError are maintained for backwards compatibility                          // 148
Meteor.startup(function () {                                                                                     // 149
  var ServiceConfiguration =                                                                                     // 150
    Package['service-configuration'].ServiceConfiguration;                                                       // 151
  Accounts.loginServiceConfiguration = ServiceConfiguration.configurations;                                      // 152
  Accounts.ConfigError = ServiceConfiguration.ConfigError;                                                       // 153
});                                                                                                              // 154
                                                                                                                 // 155
// Thrown when the user cancels the login process (eg, closes an oauth                                           // 156
// popup, declines retina scan, etc)                                                                             // 157
Accounts.LoginCancelledError = function(description) {                                                           // 158
  this.message = description;                                                                                    // 159
};                                                                                                               // 160
                                                                                                                 // 161
// This is used to transmit specific subclass errors over the wire. We should                                    // 162
// come up with a more generic way to do this (eg, with some sort of symbolic                                    // 163
// error code rather than a number).                                                                             // 164
Accounts.LoginCancelledError.numericError = 0x8acdc2f;                                                           // 165
Accounts.LoginCancelledError.prototype = new Error();                                                            // 166
Accounts.LoginCancelledError.prototype.name = 'Accounts.LoginCancelledError';                                    // 167
                                                                                                                 // 168
getTokenLifetimeMs = function () {                                                                               // 169
  return (Accounts._options.loginExpirationInDays ||                                                             // 170
          DEFAULT_LOGIN_EXPIRATION_DAYS) * 24 * 60 * 60 * 1000;                                                  // 171
};                                                                                                               // 172
                                                                                                                 // 173
Accounts._tokenExpiration = function (when) {                                                                    // 174
  // We pass when through the Date constructor for backwards compatibility;                                      // 175
  // `when` used to be a number.                                                                                 // 176
  return new Date((new Date(when)).getTime() + getTokenLifetimeMs());                                            // 177
};                                                                                                               // 178
                                                                                                                 // 179
Accounts._tokenExpiresSoon = function (when) {                                                                   // 180
  var minLifetimeMs = .1 * getTokenLifetimeMs();                                                                 // 181
  var minLifetimeCapMs = MIN_TOKEN_LIFETIME_CAP_SECS * 1000;                                                     // 182
  if (minLifetimeMs > minLifetimeCapMs)                                                                          // 183
    minLifetimeMs = minLifetimeCapMs;                                                                            // 184
  return new Date() > (new Date(when) - minLifetimeMs);                                                          // 185
};                                                                                                               // 186
                                                                                                                 // 187
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/accounts-base/accounts_server.js                                                                     //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
var crypto = Npm.require('crypto');                                                                              // 1
                                                                                                                 // 2
///                                                                                                              // 3
/// CURRENT USER                                                                                                 // 4
///                                                                                                              // 5
                                                                                                                 // 6
Meteor.userId = function () {                                                                                    // 7
  // This function only works if called inside a method. In theory, it                                           // 8
  // could also be called from publish statements, since they also                                               // 9
  // have a userId associated with them. However, given that publish                                             // 10
  // functions aren't reactive, using any of the infomation from                                                 // 11
  // Meteor.user() in a publish function will always use the value                                               // 12
  // from when the function first runs. This is likely not what the                                              // 13
  // user expects. The way to make this work in a publish is to do                                               // 14
  // Meteor.find(this.userId()).observe and recompute when the user                                              // 15
  // record changes.                                                                                             // 16
  var currentInvocation = DDP._CurrentInvocation.get();                                                          // 17
  if (!currentInvocation)                                                                                        // 18
    throw new Error("Meteor.userId can only be invoked in method calls. Use this.userId in publish functions."); // 19
  return currentInvocation.userId;                                                                               // 20
};                                                                                                               // 21
                                                                                                                 // 22
Meteor.user = function () {                                                                                      // 23
  var userId = Meteor.userId();                                                                                  // 24
  if (!userId)                                                                                                   // 25
    return null;                                                                                                 // 26
  return Meteor.users.findOne(userId);                                                                           // 27
};                                                                                                               // 28
                                                                                                                 // 29
                                                                                                                 // 30
///                                                                                                              // 31
/// LOGIN HOOKS                                                                                                  // 32
///                                                                                                              // 33
                                                                                                                 // 34
// Exceptions inside the hook callback are passed up to us.                                                      // 35
var validateLoginHook = new Hook();                                                                              // 36
                                                                                                                 // 37
// Callback exceptions are printed with Meteor._debug and ignored.                                               // 38
var onLoginHook = new Hook({                                                                                     // 39
  debugPrintExceptions: "onLogin callback"                                                                       // 40
});                                                                                                              // 41
var onLoginFailureHook = new Hook({                                                                              // 42
  debugPrintExceptions: "onLoginFailure callback"                                                                // 43
});                                                                                                              // 44
                                                                                                                 // 45
/**                                                                                                              // 46
 * @summary Validate login attempts.                                                                             // 47
 * @locus Server                                                                                                 // 48
 * @param {Function} func Called whenever a login is attempted (either successful or unsuccessful).  A login can be aborted by returning a falsy value or throwing an exception.
 */                                                                                                              // 50
Accounts.validateLoginAttempt = function (func) {                                                                // 51
  return validateLoginHook.register(func);                                                                       // 52
};                                                                                                               // 53
                                                                                                                 // 54
/**                                                                                                              // 55
 * @summary Register a callback to be called after a login attempt succeeds.                                     // 56
 * @locus Server                                                                                                 // 57
 * @param {Function} func The callback to be called when login is successful.                                    // 58
 */                                                                                                              // 59
Accounts.onLogin = function (func) {                                                                             // 60
  return onLoginHook.register(func);                                                                             // 61
};                                                                                                               // 62
                                                                                                                 // 63
/**                                                                                                              // 64
 * @summary Register a callback to be called after a login attempt fails.                                        // 65
 * @locus Server                                                                                                 // 66
 * @param {Function} func The callback to be called after the login has failed.                                  // 67
 */                                                                                                              // 68
Accounts.onLoginFailure = function (func) {                                                                      // 69
  return onLoginFailureHook.register(func);                                                                      // 70
};                                                                                                               // 71
                                                                                                                 // 72
                                                                                                                 // 73
// Give each login hook callback a fresh cloned copy of the attempt                                              // 74
// object, but don't clone the connection.                                                                       // 75
//                                                                                                               // 76
var cloneAttemptWithConnection = function (connection, attempt) {                                                // 77
  var clonedAttempt = EJSON.clone(attempt);                                                                      // 78
  clonedAttempt.connection = connection;                                                                         // 79
  return clonedAttempt;                                                                                          // 80
};                                                                                                               // 81
                                                                                                                 // 82
var validateLogin = function (connection, attempt) {                                                             // 83
  validateLoginHook.each(function (callback) {                                                                   // 84
    var ret;                                                                                                     // 85
    try {                                                                                                        // 86
      ret = callback(cloneAttemptWithConnection(connection, attempt));                                           // 87
    }                                                                                                            // 88
    catch (e) {                                                                                                  // 89
      attempt.allowed = false;                                                                                   // 90
      // XXX this means the last thrown error overrides previous error                                           // 91
      // messages. Maybe this is surprising to users and we should make                                          // 92
      // overriding errors more explicit. (see                                                                   // 93
      // https://github.com/meteor/meteor/issues/1960)                                                           // 94
      attempt.error = e;                                                                                         // 95
      return true;                                                                                               // 96
    }                                                                                                            // 97
    if (! ret) {                                                                                                 // 98
      attempt.allowed = false;                                                                                   // 99
      // don't override a specific error provided by a previous                                                  // 100
      // validator or the initial attempt (eg "incorrect password").                                             // 101
      if (!attempt.error)                                                                                        // 102
        attempt.error = new Meteor.Error(403, "Login forbidden");                                                // 103
    }                                                                                                            // 104
    return true;                                                                                                 // 105
  });                                                                                                            // 106
};                                                                                                               // 107
                                                                                                                 // 108
                                                                                                                 // 109
var successfulLogin = function (connection, attempt) {                                                           // 110
  onLoginHook.each(function (callback) {                                                                         // 111
    callback(cloneAttemptWithConnection(connection, attempt));                                                   // 112
    return true;                                                                                                 // 113
  });                                                                                                            // 114
};                                                                                                               // 115
                                                                                                                 // 116
var failedLogin = function (connection, attempt) {                                                               // 117
  onLoginFailureHook.each(function (callback) {                                                                  // 118
    callback(cloneAttemptWithConnection(connection, attempt));                                                   // 119
    return true;                                                                                                 // 120
  });                                                                                                            // 121
};                                                                                                               // 122
                                                                                                                 // 123
                                                                                                                 // 124
///                                                                                                              // 125
/// LOGIN METHODS                                                                                                // 126
///                                                                                                              // 127
                                                                                                                 // 128
// Login methods return to the client an object containing these                                                 // 129
// fields when the user was logged in successfully:                                                              // 130
//                                                                                                               // 131
//   id: userId                                                                                                  // 132
//   token: *                                                                                                    // 133
//   tokenExpires: *                                                                                             // 134
//                                                                                                               // 135
// tokenExpires is optional and intends to provide a hint to the                                                 // 136
// client as to when the token will expire. If not provided, the                                                 // 137
// client will call Accounts._tokenExpiration, passing it the date                                               // 138
// that it received the token.                                                                                   // 139
//                                                                                                               // 140
// The login method will throw an error back to the client if the user                                           // 141
// failed to log in.                                                                                             // 142
//                                                                                                               // 143
//                                                                                                               // 144
// Login handlers and service specific login methods such as                                                     // 145
// `createUser` internally return a `result` object containing these                                             // 146
// fields:                                                                                                       // 147
//                                                                                                               // 148
//   type:                                                                                                       // 149
//     optional string; the service name, overrides the handler                                                  // 150
//     default if present.                                                                                       // 151
//                                                                                                               // 152
//   error:                                                                                                      // 153
//     exception; if the user is not allowed to login, the reason why.                                           // 154
//                                                                                                               // 155
//   userId:                                                                                                     // 156
//     string; the user id of the user attempting to login (if                                                   // 157
//     known), required for an allowed login.                                                                    // 158
//                                                                                                               // 159
//   options:                                                                                                    // 160
//     optional object merged into the result returned by the login                                              // 161
//     method; used by HAMK from SRP.                                                                            // 162
//                                                                                                               // 163
//   stampedLoginToken:                                                                                          // 164
//     optional object with `token` and `when` indicating the login                                              // 165
//     token is already present in the database, returned by the                                                 // 166
//     "resume" login handler.                                                                                   // 167
//                                                                                                               // 168
// For convenience, login methods can also throw an exception, which                                             // 169
// is converted into an {error} result.  However, if the id of the                                               // 170
// user attempting the login is known, a {userId, error} result should                                           // 171
// be returned instead since the user id is not captured when an                                                 // 172
// exception is thrown.                                                                                          // 173
//                                                                                                               // 174
// This internal `result` object is automatically converted into the                                             // 175
// public {id, token, tokenExpires} object returned to the client.                                               // 176
                                                                                                                 // 177
                                                                                                                 // 178
// Try a login method, converting thrown exceptions into an {error}                                              // 179
// result.  The `type` argument is a default, inserted into the result                                           // 180
// object if not explicitly returned.                                                                            // 181
//                                                                                                               // 182
var tryLoginMethod = function (type, fn) {                                                                       // 183
  var result;                                                                                                    // 184
  try {                                                                                                          // 185
    result = fn();                                                                                               // 186
  }                                                                                                              // 187
  catch (e) {                                                                                                    // 188
    result = {error: e};                                                                                         // 189
  }                                                                                                              // 190
                                                                                                                 // 191
  if (result && !result.type && type)                                                                            // 192
    result.type = type;                                                                                          // 193
                                                                                                                 // 194
  return result;                                                                                                 // 195
};                                                                                                               // 196
                                                                                                                 // 197
                                                                                                                 // 198
// Log in a user on a connection.                                                                                // 199
//                                                                                                               // 200
// We use the method invocation to set the user id on the connection,                                            // 201
// not the connection object directly. setUserId is tied to methods to                                           // 202
// enforce clear ordering of method application (using wait methods on                                           // 203
// the client, and a no setUserId after unblock restriction on the                                               // 204
// server)                                                                                                       // 205
//                                                                                                               // 206
// The `stampedLoginToken` parameter is optional.  When present, it                                              // 207
// indicates that the login token has already been inserted into the                                             // 208
// database and doesn't need to be inserted again.  (It's used by the                                            // 209
// "resume" login handler).                                                                                      // 210
var loginUser = function (methodInvocation, userId, stampedLoginToken) {                                         // 211
  if (! stampedLoginToken) {                                                                                     // 212
    stampedLoginToken = Accounts._generateStampedLoginToken();                                                   // 213
    Accounts._insertLoginToken(userId, stampedLoginToken);                                                       // 214
  }                                                                                                              // 215
                                                                                                                 // 216
  // This order (and the avoidance of yields) is important to make                                               // 217
  // sure that when publish functions are rerun, they see a                                                      // 218
  // consistent view of the world: the userId is set and matches                                                 // 219
  // the login token on the connection (not that there is                                                        // 220
  // currently a public API for reading the login token on a                                                     // 221
  // connection).                                                                                                // 222
  Meteor._noYieldsAllowed(function () {                                                                          // 223
    Accounts._setLoginToken(                                                                                     // 224
      userId,                                                                                                    // 225
      methodInvocation.connection,                                                                               // 226
      Accounts._hashLoginToken(stampedLoginToken.token)                                                          // 227
    );                                                                                                           // 228
  });                                                                                                            // 229
                                                                                                                 // 230
  methodInvocation.setUserId(userId);                                                                            // 231
                                                                                                                 // 232
  return {                                                                                                       // 233
    id: userId,                                                                                                  // 234
    token: stampedLoginToken.token,                                                                              // 235
    tokenExpires: Accounts._tokenExpiration(stampedLoginToken.when)                                              // 236
  };                                                                                                             // 237
};                                                                                                               // 238
                                                                                                                 // 239
                                                                                                                 // 240
// After a login method has completed, call the login hooks.  Note                                               // 241
// that `attemptLogin` is called for *all* login attempts, even ones                                             // 242
// which aren't successful (such as an invalid password, etc).                                                   // 243
//                                                                                                               // 244
// If the login is allowed and isn't aborted by a validate login hook                                            // 245
// callback, log in the user.                                                                                    // 246
//                                                                                                               // 247
var attemptLogin = function (methodInvocation, methodName, methodArgs, result) {                                 // 248
  if (!result)                                                                                                   // 249
    throw new Error("result is required");                                                                       // 250
                                                                                                                 // 251
  // XXX A programming error in a login handler can lead to this occuring, and                                   // 252
  // then we don't call onLogin or onLoginFailure callbacks. Should                                              // 253
  // tryLoginMethod catch this case and turn it into an error?                                                   // 254
  if (!result.userId && !result.error)                                                                           // 255
    throw new Error("A login method must specify a userId or an error");                                         // 256
                                                                                                                 // 257
  var user;                                                                                                      // 258
  if (result.userId)                                                                                             // 259
    user = Meteor.users.findOne(result.userId);                                                                  // 260
                                                                                                                 // 261
  var attempt = {                                                                                                // 262
    type: result.type || "unknown",                                                                              // 263
    allowed: !! (result.userId && !result.error),                                                                // 264
    methodName: methodName,                                                                                      // 265
    methodArguments: _.toArray(methodArgs)                                                                       // 266
  };                                                                                                             // 267
  if (result.error)                                                                                              // 268
    attempt.error = result.error;                                                                                // 269
  if (user)                                                                                                      // 270
    attempt.user = user;                                                                                         // 271
                                                                                                                 // 272
  // validateLogin may mutate `attempt` by adding an error and changing allowed                                  // 273
  // to false, but that's the only change it can make (and the user's callbacks                                  // 274
  // only get a clone of `attempt`).                                                                             // 275
  validateLogin(methodInvocation.connection, attempt);                                                           // 276
                                                                                                                 // 277
  if (attempt.allowed) {                                                                                         // 278
    var ret = _.extend(                                                                                          // 279
      loginUser(methodInvocation, result.userId, result.stampedLoginToken),                                      // 280
      result.options || {}                                                                                       // 281
    );                                                                                                           // 282
    successfulLogin(methodInvocation.connection, attempt);                                                       // 283
    return ret;                                                                                                  // 284
  }                                                                                                              // 285
  else {                                                                                                         // 286
    failedLogin(methodInvocation.connection, attempt);                                                           // 287
    throw attempt.error;                                                                                         // 288
  }                                                                                                              // 289
};                                                                                                               // 290
                                                                                                                 // 291
                                                                                                                 // 292
// All service specific login methods should go through this function.                                           // 293
// Ensure that thrown exceptions are caught and that login hook                                                  // 294
// callbacks are still called.                                                                                   // 295
//                                                                                                               // 296
Accounts._loginMethod = function (methodInvocation, methodName, methodArgs, type, fn) {                          // 297
  return attemptLogin(                                                                                           // 298
    methodInvocation,                                                                                            // 299
    methodName,                                                                                                  // 300
    methodArgs,                                                                                                  // 301
    tryLoginMethod(type, fn)                                                                                     // 302
  );                                                                                                             // 303
};                                                                                                               // 304
                                                                                                                 // 305
                                                                                                                 // 306
// Report a login attempt failed outside the context of a normal login                                           // 307
// method. This is for use in the case where there is a multi-step login                                         // 308
// procedure (eg SRP based password login). If a method early in the                                             // 309
// chain fails, it should call this function to report a failure. There                                          // 310
// is no corresponding method for a successful login; methods that can                                           // 311
// succeed at logging a user in should always be actual login methods                                            // 312
// (using either Accounts._loginMethod or Accounts.registerLoginHandler).                                        // 313
Accounts._reportLoginFailure = function (methodInvocation, methodName, methodArgs, result) {                     // 314
  var attempt = {                                                                                                // 315
    type: result.type || "unknown",                                                                              // 316
    allowed: false,                                                                                              // 317
    error: result.error,                                                                                         // 318
    methodName: methodName,                                                                                      // 319
    methodArguments: _.toArray(methodArgs)                                                                       // 320
  };                                                                                                             // 321
  if (result.userId)                                                                                             // 322
    attempt.user = Meteor.users.findOne(result.userId);                                                          // 323
                                                                                                                 // 324
  validateLogin(methodInvocation.connection, attempt);                                                           // 325
  failedLogin(methodInvocation.connection, attempt);                                                             // 326
  // validateLogin may mutate attempt to set a new error message. Return                                         // 327
  // the modified version.                                                                                       // 328
  return attempt;                                                                                                // 329
};                                                                                                               // 330
                                                                                                                 // 331
                                                                                                                 // 332
///                                                                                                              // 333
/// LOGIN HANDLERS                                                                                               // 334
///                                                                                                              // 335
                                                                                                                 // 336
// list of all registered handlers.                                                                              // 337
var loginHandlers = [];                                                                                          // 338
                                                                                                                 // 339
// The main entry point for auth packages to hook in to login.                                                   // 340
//                                                                                                               // 341
// A login handler is a login method which can return `undefined` to                                             // 342
// indicate that the login request is not handled by this handler.                                               // 343
//                                                                                                               // 344
// @param name {String} Optional.  The service name, used by default                                             // 345
// if a specific service name isn't returned in the result.                                                      // 346
//                                                                                                               // 347
// @param handler {Function} A function that receives an options object                                          // 348
// (as passed as an argument to the `login` method) and returns one of:                                          // 349
// - `undefined`, meaning don't handle;                                                                          // 350
// - a login method result object                                                                                // 351
                                                                                                                 // 352
Accounts.registerLoginHandler = function(name, handler) {                                                        // 353
  if (! handler) {                                                                                               // 354
    handler = name;                                                                                              // 355
    name = null;                                                                                                 // 356
  }                                                                                                              // 357
  loginHandlers.push({name: name, handler: handler});                                                            // 358
};                                                                                                               // 359
                                                                                                                 // 360
                                                                                                                 // 361
// Checks a user's credentials against all the registered login                                                  // 362
// handlers, and returns a login token if the credentials are valid. It                                          // 363
// is like the login method, except that it doesn't set the logged-in                                            // 364
// user on the connection. Throws a Meteor.Error if logging in fails,                                            // 365
// including the case where none of the login handlers handled the login                                         // 366
// request. Otherwise, returns {id: userId, token: *, tokenExpires: *}.                                          // 367
//                                                                                                               // 368
// For example, if you want to login with a plaintext password, `options` could be                               // 369
//   { user: { username: <username> }, password: <password> }, or                                                // 370
//   { user: { email: <email> }, password: <password> }.                                                         // 371
                                                                                                                 // 372
// Try all of the registered login handlers until one of them doesn't                                            // 373
// return `undefined`, meaning it handled this call to `login`. Return                                           // 374
// that return value.                                                                                            // 375
var runLoginHandlers = function (methodInvocation, options) {                                                    // 376
  for (var i = 0; i < loginHandlers.length; ++i) {                                                               // 377
    var handler = loginHandlers[i];                                                                              // 378
                                                                                                                 // 379
    var result = tryLoginMethod(                                                                                 // 380
      handler.name,                                                                                              // 381
      function () {                                                                                              // 382
        return handler.handler.call(methodInvocation, options);                                                  // 383
      }                                                                                                          // 384
    );                                                                                                           // 385
                                                                                                                 // 386
    if (result)                                                                                                  // 387
      return result;                                                                                             // 388
    else if (result !== undefined)                                                                               // 389
      throw new Meteor.Error(400, "A login handler should return a result or undefined");                        // 390
  }                                                                                                              // 391
                                                                                                                 // 392
  return {                                                                                                       // 393
    type: null,                                                                                                  // 394
    error: new Meteor.Error(400, "Unrecognized options for login request")                                       // 395
  };                                                                                                             // 396
};                                                                                                               // 397
                                                                                                                 // 398
// Deletes the given loginToken from the database.                                                               // 399
//                                                                                                               // 400
// For new-style hashed token, this will cause all connections                                                   // 401
// associated with the token to be closed.                                                                       // 402
//                                                                                                               // 403
// Any connections associated with old-style unhashed tokens will be                                             // 404
// in the process of becoming associated with hashed tokens and then                                             // 405
// they'll get closed.                                                                                           // 406
Accounts.destroyToken = function (userId, loginToken) {                                                          // 407
  Meteor.users.update(userId, {                                                                                  // 408
    $pull: {                                                                                                     // 409
      "services.resume.loginTokens": {                                                                           // 410
        $or: [                                                                                                   // 411
          { hashedToken: loginToken },                                                                           // 412
          { token: loginToken }                                                                                  // 413
        ]                                                                                                        // 414
      }                                                                                                          // 415
    }                                                                                                            // 416
  });                                                                                                            // 417
};                                                                                                               // 418
                                                                                                                 // 419
// Actual methods for login and logout. This is the entry point for                                              // 420
// clients to actually log in.                                                                                   // 421
Meteor.methods({                                                                                                 // 422
  // @returns {Object|null}                                                                                      // 423
  //   If successful, returns {token: reconnectToken, id: userId}                                                // 424
  //   If unsuccessful (for example, if the user closed the oauth login popup),                                  // 425
  //     throws an error describing the reason                                                                   // 426
  login: function(options) {                                                                                     // 427
    var self = this;                                                                                             // 428
                                                                                                                 // 429
    // Login handlers should really also check whatever field they look at in                                    // 430
    // options, but we don't enforce it.                                                                         // 431
    check(options, Object);                                                                                      // 432
                                                                                                                 // 433
    var result = runLoginHandlers(self, options);                                                                // 434
                                                                                                                 // 435
    return attemptLogin(self, "login", arguments, result);                                                       // 436
  },                                                                                                             // 437
                                                                                                                 // 438
  logout: function() {                                                                                           // 439
    var token = Accounts._getLoginToken(this.connection.id);                                                     // 440
    Accounts._setLoginToken(this.userId, this.connection, null);                                                 // 441
    if (token && this.userId)                                                                                    // 442
      Accounts.destroyToken(this.userId, token);                                                                 // 443
    this.setUserId(null);                                                                                        // 444
  },                                                                                                             // 445
                                                                                                                 // 446
  // Delete all the current user's tokens and close all open connections logged                                  // 447
  // in as this user. Returns a fresh new login token that this client can                                       // 448
  // use. Tests set Accounts._noConnectionCloseDelayForTest to delete tokens                                     // 449
  // immediately instead of using a delay.                                                                       // 450
  //                                                                                                             // 451
  // XXX COMPAT WITH 0.7.2                                                                                       // 452
  // This single `logoutOtherClients` method has been replaced with two                                          // 453
  // methods, one that you call to get a new token, and another that you                                         // 454
  // call to remove all tokens except your own. The new design allows                                            // 455
  // clients to know when other clients have actually been logged                                                // 456
  // out. (The `logoutOtherClients` method guarantees the caller that                                            // 457
  // the other clients will be logged out at some point, but makes no                                            // 458
  // guarantees about when.) This method is left in for backwards                                                // 459
  // compatibility, especially since application code might be calling                                           // 460
  // this method directly.                                                                                       // 461
  //                                                                                                             // 462
  // @returns {Object} Object with token and tokenExpires keys.                                                  // 463
  logoutOtherClients: function () {                                                                              // 464
    var self = this;                                                                                             // 465
    var user = Meteor.users.findOne(self.userId, {                                                               // 466
      fields: {                                                                                                  // 467
        "services.resume.loginTokens": true                                                                      // 468
      }                                                                                                          // 469
    });                                                                                                          // 470
    if (user) {                                                                                                  // 471
      // Save the current tokens in the database to be deleted in                                                // 472
      // CONNECTION_CLOSE_DELAY_MS ms. This gives other connections in the                                       // 473
      // caller's browser time to find the fresh token in localStorage. We save                                  // 474
      // the tokens in the database in case we crash before actually deleting                                    // 475
      // them.                                                                                                   // 476
      var tokens = user.services.resume.loginTokens;                                                             // 477
      var newToken = Accounts._generateStampedLoginToken();                                                      // 478
      var userId = self.userId;                                                                                  // 479
      Meteor.users.update(userId, {                                                                              // 480
        $set: {                                                                                                  // 481
          "services.resume.loginTokensToDelete": tokens,                                                         // 482
          "services.resume.haveLoginTokensToDelete": true                                                        // 483
        },                                                                                                       // 484
        $push: { "services.resume.loginTokens": Accounts._hashStampedToken(newToken) }                           // 485
      });                                                                                                        // 486
      Meteor.setTimeout(function () {                                                                            // 487
        // The observe on Meteor.users will take care of closing the connections                                 // 488
        // associated with `tokens`.                                                                             // 489
        deleteSavedTokens(userId, tokens);                                                                       // 490
      }, Accounts._noConnectionCloseDelayForTest ? 0 :                                                           // 491
                        CONNECTION_CLOSE_DELAY_MS);                                                              // 492
      // We do not set the login token on this connection, but instead the                                       // 493
      // observe closes the connection and the client will reconnect with the                                    // 494
      // new token.                                                                                              // 495
      return {                                                                                                   // 496
        token: newToken.token,                                                                                   // 497
        tokenExpires: Accounts._tokenExpiration(newToken.when)                                                   // 498
      };                                                                                                         // 499
    } else {                                                                                                     // 500
      throw new Meteor.Error("You are not logged in.");                                                          // 501
    }                                                                                                            // 502
  },                                                                                                             // 503
                                                                                                                 // 504
  // Generates a new login token with the same expiration as the                                                 // 505
  // connection's current token and saves it to the database. Associates                                         // 506
  // the connection with this new token and returns it. Throws an error                                          // 507
  // if called on a connection that isn't logged in.                                                             // 508
  //                                                                                                             // 509
  // @returns Object                                                                                             // 510
  //   If successful, returns { token: <new token>, id: <user id>,                                               // 511
  //   tokenExpires: <expiration date> }.                                                                        // 512
  getNewToken: function () {                                                                                     // 513
    var self = this;                                                                                             // 514
    var user = Meteor.users.findOne(self.userId, {                                                               // 515
      fields: { "services.resume.loginTokens": 1 }                                                               // 516
    });                                                                                                          // 517
    if (! self.userId || ! user) {                                                                               // 518
      throw new Meteor.Error("You are not logged in.");                                                          // 519
    }                                                                                                            // 520
    // Be careful not to generate a new token that has a later                                                   // 521
    // expiration than the curren token. Otherwise, a bad guy with a                                             // 522
    // stolen token could use this method to stop his stolen token from                                          // 523
    // ever expiring.                                                                                            // 524
    var currentHashedToken = Accounts._getLoginToken(self.connection.id);                                        // 525
    var currentStampedToken = _.find(                                                                            // 526
      user.services.resume.loginTokens,                                                                          // 527
      function (stampedToken) {                                                                                  // 528
        return stampedToken.hashedToken === currentHashedToken;                                                  // 529
      }                                                                                                          // 530
    );                                                                                                           // 531
    if (! currentStampedToken) { // safety belt: this should never happen                                        // 532
      throw new Meteor.Error("Invalid login token");                                                             // 533
    }                                                                                                            // 534
    var newStampedToken = Accounts._generateStampedLoginToken();                                                 // 535
    newStampedToken.when = currentStampedToken.when;                                                             // 536
    Accounts._insertLoginToken(self.userId, newStampedToken);                                                    // 537
    return loginUser(self, self.userId, newStampedToken);                                                        // 538
  },                                                                                                             // 539
                                                                                                                 // 540
  // Removes all tokens except the token associated with the current                                             // 541
  // connection. Throws an error if the connection is not logged                                                 // 542
  // in. Returns nothing on success.                                                                             // 543
  removeOtherTokens: function () {                                                                               // 544
    var self = this;                                                                                             // 545
    if (! self.userId) {                                                                                         // 546
      throw new Meteor.Error("You are not logged in.");                                                          // 547
    }                                                                                                            // 548
    var currentToken = Accounts._getLoginToken(self.connection.id);                                              // 549
    Meteor.users.update(self.userId, {                                                                           // 550
      $pull: {                                                                                                   // 551
        "services.resume.loginTokens": { hashedToken: { $ne: currentToken } }                                    // 552
      }                                                                                                          // 553
    });                                                                                                          // 554
  }                                                                                                              // 555
});                                                                                                              // 556
                                                                                                                 // 557
///                                                                                                              // 558
/// ACCOUNT DATA                                                                                                 // 559
///                                                                                                              // 560
                                                                                                                 // 561
// connectionId -> {connection, loginToken}                                                                      // 562
var accountData = {};                                                                                            // 563
                                                                                                                 // 564
// HACK: This is used by 'meteor-accounts' to get the loginToken for a                                           // 565
// connection. Maybe there should be a public way to do that.                                                    // 566
Accounts._getAccountData = function (connectionId, field) {                                                      // 567
  var data = accountData[connectionId];                                                                          // 568
  return data && data[field];                                                                                    // 569
};                                                                                                               // 570
                                                                                                                 // 571
Accounts._setAccountData = function (connectionId, field, value) {                                               // 572
  var data = accountData[connectionId];                                                                          // 573
                                                                                                                 // 574
  // safety belt. shouldn't happen. accountData is set in onConnection,                                          // 575
  // we don't have a connectionId until it is set.                                                               // 576
  if (!data)                                                                                                     // 577
    return;                                                                                                      // 578
                                                                                                                 // 579
  if (value === undefined)                                                                                       // 580
    delete data[field];                                                                                          // 581
  else                                                                                                           // 582
    data[field] = value;                                                                                         // 583
};                                                                                                               // 584
                                                                                                                 // 585
Meteor.server.onConnection(function (connection) {                                                               // 586
  accountData[connection.id] = {connection: connection};                                                         // 587
  connection.onClose(function () {                                                                               // 588
    removeTokenFromConnection(connection.id);                                                                    // 589
    delete accountData[connection.id];                                                                           // 590
  });                                                                                                            // 591
});                                                                                                              // 592
                                                                                                                 // 593
                                                                                                                 // 594
///                                                                                                              // 595
/// RECONNECT TOKENS                                                                                             // 596
///                                                                                                              // 597
/// support reconnecting using a meteor login token                                                              // 598
                                                                                                                 // 599
Accounts._hashLoginToken = function (loginToken) {                                                               // 600
  var hash = crypto.createHash('sha256');                                                                        // 601
  hash.update(loginToken);                                                                                       // 602
  return hash.digest('base64');                                                                                  // 603
};                                                                                                               // 604
                                                                                                                 // 605
                                                                                                                 // 606
// {token, when} => {hashedToken, when}                                                                          // 607
Accounts._hashStampedToken = function (stampedToken) {                                                           // 608
  return _.extend(                                                                                               // 609
    _.omit(stampedToken, 'token'),                                                                               // 610
    {hashedToken: Accounts._hashLoginToken(stampedToken.token)}                                                  // 611
  );                                                                                                             // 612
};                                                                                                               // 613
                                                                                                                 // 614
                                                                                                                 // 615
// Using $addToSet avoids getting an index error if another client                                               // 616
// logging in simultaneously has already inserted the new hashed                                                 // 617
// token.                                                                                                        // 618
Accounts._insertHashedLoginToken = function (userId, hashedToken, query) {                                       // 619
  query = query ? _.clone(query) : {};                                                                           // 620
  query._id = userId;                                                                                            // 621
  Meteor.users.update(                                                                                           // 622
    query,                                                                                                       // 623
    { $addToSet: {                                                                                               // 624
        "services.resume.loginTokens": hashedToken                                                               // 625
    } }                                                                                                          // 626
  );                                                                                                             // 627
};                                                                                                               // 628
                                                                                                                 // 629
                                                                                                                 // 630
// Exported for tests.                                                                                           // 631
Accounts._insertLoginToken = function (userId, stampedToken, query) {                                            // 632
  Accounts._insertHashedLoginToken(                                                                              // 633
    userId,                                                                                                      // 634
    Accounts._hashStampedToken(stampedToken),                                                                    // 635
    query                                                                                                        // 636
  );                                                                                                             // 637
};                                                                                                               // 638
                                                                                                                 // 639
                                                                                                                 // 640
Accounts._clearAllLoginTokens = function (userId) {                                                              // 641
  Meteor.users.update(                                                                                           // 642
    userId,                                                                                                      // 643
    {$set: {'services.resume.loginTokens': []}}                                                                  // 644
  );                                                                                                             // 645
};                                                                                                               // 646
                                                                                                                 // 647
// connection id -> observe handle for the login token that this                                                 // 648
// connection is currently associated with, or null. Null indicates that                                         // 649
// we are in the process of setting up the observe.                                                              // 650
var userObservesForConnections = {};                                                                             // 651
                                                                                                                 // 652
// test hook                                                                                                     // 653
Accounts._getUserObserve = function (connectionId) {                                                             // 654
  return userObservesForConnections[connectionId];                                                               // 655
};                                                                                                               // 656
                                                                                                                 // 657
// Clean up this connection's association with the token: that is, stop                                          // 658
// the observe that we started when we associated the connection with                                            // 659
// this token.                                                                                                   // 660
var removeTokenFromConnection = function (connectionId) {                                                        // 661
  if (_.has(userObservesForConnections, connectionId)) {                                                         // 662
    var observe = userObservesForConnections[connectionId];                                                      // 663
    if (observe === null) {                                                                                      // 664
      // We're in the process of setting up an observe for this                                                  // 665
      // connection. We can't clean up that observe yet, but if we                                               // 666
      // delete the null placeholder for this connection, then the                                               // 667
      // observe will get cleaned up as soon as it has been set up.                                              // 668
      delete userObservesForConnections[connectionId];                                                           // 669
    } else {                                                                                                     // 670
      delete userObservesForConnections[connectionId];                                                           // 671
      observe.stop();                                                                                            // 672
    }                                                                                                            // 673
  }                                                                                                              // 674
};                                                                                                               // 675
                                                                                                                 // 676
Accounts._getLoginToken = function (connectionId) {                                                              // 677
  return Accounts._getAccountData(connectionId, 'loginToken');                                                   // 678
};                                                                                                               // 679
                                                                                                                 // 680
// newToken is a hashed token.                                                                                   // 681
Accounts._setLoginToken = function (userId, connection, newToken) {                                              // 682
  removeTokenFromConnection(connection.id);                                                                      // 683
  Accounts._setAccountData(connection.id, 'loginToken', newToken);                                               // 684
                                                                                                                 // 685
  if (newToken) {                                                                                                // 686
    // Set up an observe for this token. If the token goes away, we need                                         // 687
    // to close the connection.  We defer the observe because there's                                            // 688
    // no need for it to be on the critical path for login; we just need                                         // 689
    // to ensure that the connection will get closed at some point if                                            // 690
    // the token gets deleted.                                                                                   // 691
    //                                                                                                           // 692
    // Initially, we set the observe for this connection to null; this                                           // 693
    // signifies to other code (which might run while we yield) that we                                          // 694
    // are in the process of setting up an observe for this                                                      // 695
    // connection. Once the observe is ready to go, we replace null with                                         // 696
    // the real observe handle (unless the placeholder has been deleted,                                         // 697
    // signifying that the connection was closed already -- in this case                                         // 698
    // we just clean up the observe that we started).                                                            // 699
    userObservesForConnections[connection.id] = null;                                                            // 700
    Meteor.defer(function () {                                                                                   // 701
      var foundMatchingUser;                                                                                     // 702
      // Because we upgrade unhashed login tokens to hashed tokens at                                            // 703
      // login time, sessions will only be logged in with a hashed                                               // 704
      // token. Thus we only need to observe hashed tokens here.                                                 // 705
      var observe = Meteor.users.find({                                                                          // 706
        _id: userId,                                                                                             // 707
        'services.resume.loginTokens.hashedToken': newToken                                                      // 708
      }, { fields: { _id: 1 } }).observeChanges({                                                                // 709
        added: function () {                                                                                     // 710
          foundMatchingUser = true;                                                                              // 711
        },                                                                                                       // 712
        removed: function () {                                                                                   // 713
          connection.close();                                                                                    // 714
          // The onClose callback for the connection takes care of                                               // 715
          // cleaning up the observe handle and any other state we have                                          // 716
          // lying around.                                                                                       // 717
        }                                                                                                        // 718
      });                                                                                                        // 719
                                                                                                                 // 720
      // If the user ran another login or logout command we were waiting for                                     // 721
      // the defer or added to fire, then we let the later one win (start an                                     // 722
      // observe, etc) and just stop our observe now.                                                            // 723
      //                                                                                                         // 724
      // Similarly, if the connection was already closed, then the onClose                                       // 725
      // callback would have called removeTokenFromConnection and there won't be                                 // 726
      // an entry in userObservesForConnections. We can stop the observe.                                        // 727
      if (Accounts._getAccountData(connection.id, 'loginToken') !== newToken ||                                  // 728
          !_.has(userObservesForConnections, connection.id)) {                                                   // 729
        observe.stop();                                                                                          // 730
        return;                                                                                                  // 731
      }                                                                                                          // 732
                                                                                                                 // 733
      if (userObservesForConnections[connection.id] !== null) {                                                  // 734
        throw new Error("Non-null user observe for connection " +                                                // 735
                        connection.id + " while observe was being set up?");                                     // 736
      }                                                                                                          // 737
                                                                                                                 // 738
      userObservesForConnections[connection.id] = observe;                                                       // 739
                                                                                                                 // 740
      if (! foundMatchingUser) {                                                                                 // 741
        // We've set up an observe on the user associated with `newToken`,                                       // 742
        // so if the new token is removed from the database, we'll close                                         // 743
        // the connection. But the token might have already been deleted                                         // 744
        // before we set up the observe, which wouldn't have closed the                                          // 745
        // connection because the observe wasn't running yet.                                                    // 746
        connection.close();                                                                                      // 747
      }                                                                                                          // 748
    });                                                                                                          // 749
  }                                                                                                              // 750
};                                                                                                               // 751
                                                                                                                 // 752
// Login handler for resume tokens.                                                                              // 753
Accounts.registerLoginHandler("resume", function(options) {                                                      // 754
  if (!options.resume)                                                                                           // 755
    return undefined;                                                                                            // 756
                                                                                                                 // 757
  check(options.resume, String);                                                                                 // 758
                                                                                                                 // 759
  var hashedToken = Accounts._hashLoginToken(options.resume);                                                    // 760
                                                                                                                 // 761
  // First look for just the new-style hashed login token, to avoid                                              // 762
  // sending the unhashed token to the database in a query if we don't                                           // 763
  // need to.                                                                                                    // 764
  var user = Meteor.users.findOne(                                                                               // 765
    {"services.resume.loginTokens.hashedToken": hashedToken});                                                   // 766
                                                                                                                 // 767
  if (! user) {                                                                                                  // 768
    // If we didn't find the hashed login token, try also looking for                                            // 769
    // the old-style unhashed token.  But we need to look for either                                             // 770
    // the old-style token OR the new-style token, because another                                               // 771
    // client connection logging in simultaneously might have already                                            // 772
    // converted the token.                                                                                      // 773
    user = Meteor.users.findOne({                                                                                // 774
      $or: [                                                                                                     // 775
        {"services.resume.loginTokens.hashedToken": hashedToken},                                                // 776
        {"services.resume.loginTokens.token": options.resume}                                                    // 777
      ]                                                                                                          // 778
    });                                                                                                          // 779
  }                                                                                                              // 780
                                                                                                                 // 781
  if (! user)                                                                                                    // 782
    return {                                                                                                     // 783
      error: new Meteor.Error(403, "You've been logged out by the server. Please log in again.")                 // 784
    };                                                                                                           // 785
                                                                                                                 // 786
  // Find the token, which will either be an object with fields                                                  // 787
  // {hashedToken, when} for a hashed token or {token, when} for an                                              // 788
  // unhashed token.                                                                                             // 789
  var oldUnhashedStyleToken;                                                                                     // 790
  var token = _.find(user.services.resume.loginTokens, function (token) {                                        // 791
    return token.hashedToken === hashedToken;                                                                    // 792
  });                                                                                                            // 793
  if (token) {                                                                                                   // 794
    oldUnhashedStyleToken = false;                                                                               // 795
  } else {                                                                                                       // 796
    token = _.find(user.services.resume.loginTokens, function (token) {                                          // 797
      return token.token === options.resume;                                                                     // 798
    });                                                                                                          // 799
    oldUnhashedStyleToken = true;                                                                                // 800
  }                                                                                                              // 801
                                                                                                                 // 802
  var tokenExpires = Accounts._tokenExpiration(token.when);                                                      // 803
  if (new Date() >= tokenExpires)                                                                                // 804
    return {                                                                                                     // 805
      userId: user._id,                                                                                          // 806
      error: new Meteor.Error(403, "Your session has expired. Please log in again.")                             // 807
    };                                                                                                           // 808
                                                                                                                 // 809
  // Update to a hashed token when an unhashed token is encountered.                                             // 810
  if (oldUnhashedStyleToken) {                                                                                   // 811
    // Only add the new hashed token if the old unhashed token still                                             // 812
    // exists (this avoids resurrecting the token if it was deleted                                              // 813
    // after we read it).  Using $addToSet avoids getting an index                                               // 814
    // error if another client logging in simultaneously has already                                             // 815
    // inserted the new hashed token.                                                                            // 816
    Meteor.users.update(                                                                                         // 817
      {                                                                                                          // 818
        _id: user._id,                                                                                           // 819
        "services.resume.loginTokens.token": options.resume                                                      // 820
      },                                                                                                         // 821
      {$addToSet: {                                                                                              // 822
        "services.resume.loginTokens": {                                                                         // 823
          "hashedToken": hashedToken,                                                                            // 824
          "when": token.when                                                                                     // 825
        }                                                                                                        // 826
      }}                                                                                                         // 827
    );                                                                                                           // 828
                                                                                                                 // 829
    // Remove the old token *after* adding the new, since otherwise                                              // 830
    // another client trying to login between our removing the old and                                           // 831
    // adding the new wouldn't find a token to login with.                                                       // 832
    Meteor.users.update(user._id, {                                                                              // 833
      $pull: {                                                                                                   // 834
        "services.resume.loginTokens": { "token": options.resume }                                               // 835
      }                                                                                                          // 836
    });                                                                                                          // 837
  }                                                                                                              // 838
                                                                                                                 // 839
  return {                                                                                                       // 840
    userId: user._id,                                                                                            // 841
    stampedLoginToken: {                                                                                         // 842
      token: options.resume,                                                                                     // 843
      when: token.when                                                                                           // 844
    }                                                                                                            // 845
  };                                                                                                             // 846
});                                                                                                              // 847
                                                                                                                 // 848
// (Also used by Meteor Accounts server and tests).                                                              // 849
//                                                                                                               // 850
Accounts._generateStampedLoginToken = function () {                                                              // 851
  return {token: Random.secret(), when: (new Date)};                                                             // 852
};                                                                                                               // 853
                                                                                                                 // 854
///                                                                                                              // 855
/// TOKEN EXPIRATION                                                                                             // 856
///                                                                                                              // 857
                                                                                                                 // 858
var expireTokenInterval;                                                                                         // 859
                                                                                                                 // 860
// Deletes expired tokens from the database and closes all open connections                                      // 861
// associated with these tokens.                                                                                 // 862
//                                                                                                               // 863
// Exported for tests. Also, the arguments are only used by                                                      // 864
// tests. oldestValidDate is simulate expiring tokens without waiting                                            // 865
// for them to actually expire. userId is used by tests to only expire                                           // 866
// tokens for the test user.                                                                                     // 867
var expireTokens = Accounts._expireTokens = function (oldestValidDate, userId) {                                 // 868
  var tokenLifetimeMs = getTokenLifetimeMs();                                                                    // 869
                                                                                                                 // 870
  // when calling from a test with extra arguments, you must specify both!                                       // 871
  if ((oldestValidDate && !userId) || (!oldestValidDate && userId)) {                                            // 872
    throw new Error("Bad test. Must specify both oldestValidDate and userId.");                                  // 873
  }                                                                                                              // 874
                                                                                                                 // 875
  oldestValidDate = oldestValidDate ||                                                                           // 876
    (new Date(new Date() - tokenLifetimeMs));                                                                    // 877
  var userFilter = userId ? {_id: userId} : {};                                                                  // 878
                                                                                                                 // 879
                                                                                                                 // 880
  // Backwards compatible with older versions of meteor that stored login token                                  // 881
  // timestamps as numbers.                                                                                      // 882
  Meteor.users.update(_.extend(userFilter, {                                                                     // 883
    $or: [                                                                                                       // 884
      { "services.resume.loginTokens.when": { $lt: oldestValidDate } },                                          // 885
      { "services.resume.loginTokens.when": { $lt: +oldestValidDate } }                                          // 886
    ]                                                                                                            // 887
  }), {                                                                                                          // 888
    $pull: {                                                                                                     // 889
      "services.resume.loginTokens": {                                                                           // 890
        $or: [                                                                                                   // 891
          { when: { $lt: oldestValidDate } },                                                                    // 892
          { when: { $lt: +oldestValidDate } }                                                                    // 893
        ]                                                                                                        // 894
      }                                                                                                          // 895
    }                                                                                                            // 896
  }, { multi: true });                                                                                           // 897
  // The observe on Meteor.users will take care of closing connections for                                       // 898
  // expired tokens.                                                                                             // 899
};                                                                                                               // 900
                                                                                                                 // 901
maybeStopExpireTokensInterval = function () {                                                                    // 902
  if (_.has(Accounts._options, "loginExpirationInDays") &&                                                       // 903
      Accounts._options.loginExpirationInDays === null &&                                                        // 904
      expireTokenInterval) {                                                                                     // 905
    Meteor.clearInterval(expireTokenInterval);                                                                   // 906
    expireTokenInterval = null;                                                                                  // 907
  }                                                                                                              // 908
};                                                                                                               // 909
                                                                                                                 // 910
expireTokenInterval = Meteor.setInterval(expireTokens,                                                           // 911
                                         EXPIRE_TOKENS_INTERVAL_MS);                                             // 912
                                                                                                                 // 913
                                                                                                                 // 914
///                                                                                                              // 915
/// OAuth Encryption Support                                                                                     // 916
///                                                                                                              // 917
                                                                                                                 // 918
var OAuthEncryption = Package["oauth-encryption"] && Package["oauth-encryption"].OAuthEncryption;                // 919
                                                                                                                 // 920
                                                                                                                 // 921
var usingOAuthEncryption = function () {                                                                         // 922
  return OAuthEncryption && OAuthEncryption.keyIsLoaded();                                                       // 923
};                                                                                                               // 924
                                                                                                                 // 925
                                                                                                                 // 926
// OAuth service data is temporarily stored in the pending credentials                                           // 927
// collection during the oauth authentication process.  Sensitive data                                           // 928
// such as access tokens are encrypted without the user id because                                               // 929
// we don't know the user id yet.  We re-encrypt these fields with the                                           // 930
// user id included when storing the service data permanently in                                                 // 931
// the users collection.                                                                                         // 932
//                                                                                                               // 933
var pinEncryptedFieldsToUser = function (serviceData, userId) {                                                  // 934
  _.each(_.keys(serviceData), function (key) {                                                                   // 935
    var value = serviceData[key];                                                                                // 936
    if (OAuthEncryption && OAuthEncryption.isSealed(value))                                                      // 937
      value = OAuthEncryption.seal(OAuthEncryption.open(value), userId);                                         // 938
    serviceData[key] = value;                                                                                    // 939
  });                                                                                                            // 940
};                                                                                                               // 941
                                                                                                                 // 942
                                                                                                                 // 943
// Encrypt unencrypted login service secrets when oauth-encryption is                                            // 944
// added.                                                                                                        // 945
//                                                                                                               // 946
// XXX For the oauthSecretKey to be available here at startup, the                                               // 947
// developer must call Accounts.config({oauthSecretKey: ...}) at load                                            // 948
// time, instead of in a Meteor.startup block, because the startup                                               // 949
// block in the app code will run after this accounts-base startup                                               // 950
// block.  Perhaps we need a post-startup callback?                                                              // 951
                                                                                                                 // 952
Meteor.startup(function () {                                                                                     // 953
  if (!usingOAuthEncryption())                                                                                   // 954
    return;                                                                                                      // 955
                                                                                                                 // 956
  var ServiceConfiguration =                                                                                     // 957
    Package['service-configuration'].ServiceConfiguration;                                                       // 958
                                                                                                                 // 959
  ServiceConfiguration.configurations.find( {$and: [                                                             // 960
      { secret: {$exists: true} },                                                                               // 961
      { "secret.algorithm": {$exists: false} }                                                                   // 962
    ] } ).                                                                                                       // 963
    forEach(function (config) {                                                                                  // 964
      ServiceConfiguration.configurations.update(                                                                // 965
        config._id,                                                                                              // 966
        { $set: {                                                                                                // 967
          secret: OAuthEncryption.seal(config.secret)                                                            // 968
        } }                                                                                                      // 969
      );                                                                                                         // 970
    });                                                                                                          // 971
});                                                                                                              // 972
                                                                                                                 // 973
                                                                                                                 // 974
///                                                                                                              // 975
/// CREATE USER HOOKS                                                                                            // 976
///                                                                                                              // 977
                                                                                                                 // 978
var onCreateUserHook = null;                                                                                     // 979
                                                                                                                 // 980
/**                                                                                                              // 981
 * @summary Customize new user creation.                                                                         // 982
 * @locus Server                                                                                                 // 983
 * @param {Function} func Called whenever a new user is created. Return the new user object, or throw an `Error` to abort the creation.
 */                                                                                                              // 985
Accounts.onCreateUser = function (func) {                                                                        // 986
  if (onCreateUserHook)                                                                                          // 987
    throw new Error("Can only call onCreateUser once");                                                          // 988
  else                                                                                                           // 989
    onCreateUserHook = func;                                                                                     // 990
};                                                                                                               // 991
                                                                                                                 // 992
// XXX see comment on Accounts.createUser in passwords_server about adding a                                     // 993
// second "server options" argument.                                                                             // 994
var defaultCreateUserHook = function (options, user) {                                                           // 995
  if (options.profile)                                                                                           // 996
    user.profile = options.profile;                                                                              // 997
  return user;                                                                                                   // 998
};                                                                                                               // 999
                                                                                                                 // 1000
// Called by accounts-password                                                                                   // 1001
Accounts.insertUserDoc = function (options, user) {                                                              // 1002
  // - clone user document, to protect from modification                                                         // 1003
  // - add createdAt timestamp                                                                                   // 1004
  // - prepare an _id, so that you can modify other collections (eg                                              // 1005
  // create a first task for every new user)                                                                     // 1006
  //                                                                                                             // 1007
  // XXX If the onCreateUser or validateNewUser hooks fail, we might                                             // 1008
  // end up having modified some other collection                                                                // 1009
  // inappropriately. The solution is probably to have onCreateUser                                              // 1010
  // accept two callbacks - one that gets called before inserting                                                // 1011
  // the user document (in which you can modify its contents), and                                               // 1012
  // one that gets called after (in which you should change other                                                // 1013
  // collections)                                                                                                // 1014
  user = _.extend({createdAt: new Date(), _id: Random.id()}, user);                                              // 1015
                                                                                                                 // 1016
  if (user.services)                                                                                             // 1017
    _.each(user.services, function (serviceData) {                                                               // 1018
      pinEncryptedFieldsToUser(serviceData, user._id);                                                           // 1019
    });                                                                                                          // 1020
                                                                                                                 // 1021
  var fullUser;                                                                                                  // 1022
  if (onCreateUserHook) {                                                                                        // 1023
    fullUser = onCreateUserHook(options, user);                                                                  // 1024
                                                                                                                 // 1025
    // This is *not* part of the API. We need this because we can't isolate                                      // 1026
    // the global server environment between tests, meaning we can't test                                        // 1027
    // both having a create user hook set and not having one set.                                                // 1028
    if (fullUser === 'TEST DEFAULT HOOK')                                                                        // 1029
      fullUser = defaultCreateUserHook(options, user);                                                           // 1030
  } else {                                                                                                       // 1031
    fullUser = defaultCreateUserHook(options, user);                                                             // 1032
  }                                                                                                              // 1033
                                                                                                                 // 1034
  _.each(validateNewUserHooks, function (hook) {                                                                 // 1035
    if (!hook(fullUser))                                                                                         // 1036
      throw new Meteor.Error(403, "User validation failed");                                                     // 1037
  });                                                                                                            // 1038
                                                                                                                 // 1039
  var userId;                                                                                                    // 1040
  try {                                                                                                          // 1041
    userId = Meteor.users.insert(fullUser);                                                                      // 1042
  } catch (e) {                                                                                                  // 1043
    // XXX string parsing sucks, maybe                                                                           // 1044
    // https://jira.mongodb.org/browse/SERVER-3069 will get fixed one day                                        // 1045
    if (e.name !== 'MongoError') throw e;                                                                        // 1046
    var match = e.err.match(/E11000 duplicate key error index: ([^ ]+)/);                                        // 1047
    if (!match) throw e;                                                                                         // 1048
    if (match[1].indexOf('$emails.address') !== -1)                                                              // 1049
      throw new Meteor.Error(403, "Email already exists.");                                                      // 1050
    if (match[1].indexOf('username') !== -1)                                                                     // 1051
      throw new Meteor.Error(403, "Username already exists.");                                                   // 1052
    // XXX better error reporting for services.facebook.id duplicate, etc                                        // 1053
    throw e;                                                                                                     // 1054
  }                                                                                                              // 1055
  return userId;                                                                                                 // 1056
};                                                                                                               // 1057
                                                                                                                 // 1058
var validateNewUserHooks = [];                                                                                   // 1059
                                                                                                                 // 1060
/**                                                                                                              // 1061
 * @summary Set restrictions on new user creation.                                                               // 1062
 * @locus Server                                                                                                 // 1063
 * @param {Function} func Called whenever a new user is created. Takes the new user object, and returns true to allow the creation or false to abort.
 */                                                                                                              // 1065
Accounts.validateNewUser = function (func) {                                                                     // 1066
  validateNewUserHooks.push(func);                                                                               // 1067
};                                                                                                               // 1068
                                                                                                                 // 1069
// XXX Find a better place for this utility function                                                             // 1070
// Like Perl's quotemeta: quotes all regexp metacharacters. See                                                  // 1071
//   https://github.com/substack/quotemeta/blob/master/index.js                                                  // 1072
var quotemeta = function (str) {                                                                                 // 1073
    return String(str).replace(/(\W)/g, '\\$1');                                                                 // 1074
};                                                                                                               // 1075
                                                                                                                 // 1076
// Helper function: returns false if email does not match company domain from                                    // 1077
// the configuration.                                                                                            // 1078
var testEmailDomain = function (email) {                                                                         // 1079
  var domain = Accounts._options.restrictCreationByEmailDomain;                                                  // 1080
  return !domain ||                                                                                              // 1081
    (_.isFunction(domain) && domain(email)) ||                                                                   // 1082
    (_.isString(domain) &&                                                                                       // 1083
      (new RegExp('@' + quotemeta(domain) + '$', 'i')).test(email));                                             // 1084
};                                                                                                               // 1085
                                                                                                                 // 1086
// Validate new user's email or Google/Facebook/GitHub account's email                                           // 1087
Accounts.validateNewUser(function (user) {                                                                       // 1088
  var domain = Accounts._options.restrictCreationByEmailDomain;                                                  // 1089
  if (!domain)                                                                                                   // 1090
    return true;                                                                                                 // 1091
                                                                                                                 // 1092
  var emailIsGood = false;                                                                                       // 1093
  if (!_.isEmpty(user.emails)) {                                                                                 // 1094
    emailIsGood = _.any(user.emails, function (email) {                                                          // 1095
      return testEmailDomain(email.address);                                                                     // 1096
    });                                                                                                          // 1097
  } else if (!_.isEmpty(user.services)) {                                                                        // 1098
    // Find any email of any service and check it                                                                // 1099
    emailIsGood = _.any(user.services, function (service) {                                                      // 1100
      return service.email && testEmailDomain(service.email);                                                    // 1101
    });                                                                                                          // 1102
  }                                                                                                              // 1103
                                                                                                                 // 1104
  if (emailIsGood)                                                                                               // 1105
    return true;                                                                                                 // 1106
                                                                                                                 // 1107
  if (_.isString(domain))                                                                                        // 1108
    throw new Meteor.Error(403, "@" + domain + " email required");                                               // 1109
  else                                                                                                           // 1110
    throw new Meteor.Error(403, "Email doesn't match the criteria.");                                            // 1111
});                                                                                                              // 1112
                                                                                                                 // 1113
///                                                                                                              // 1114
/// MANAGING USER OBJECTS                                                                                        // 1115
///                                                                                                              // 1116
                                                                                                                 // 1117
// Updates or creates a user after we authenticate with a 3rd party.                                             // 1118
//                                                                                                               // 1119
// @param serviceName {String} Service name (eg, twitter).                                                       // 1120
// @param serviceData {Object} Data to store in the user's record                                                // 1121
//        under services[serviceName]. Must include an "id" field                                                // 1122
//        which is a unique identifier for the user in the service.                                              // 1123
// @param options {Object, optional} Other options to pass to insertUserDoc                                      // 1124
//        (eg, profile)                                                                                          // 1125
// @returns {Object} Object with token and id keys, like the result                                              // 1126
//        of the "login" method.                                                                                 // 1127
//                                                                                                               // 1128
Accounts.updateOrCreateUserFromExternalService = function(                                                       // 1129
  serviceName, serviceData, options) {                                                                           // 1130
  options = _.clone(options || {});                                                                              // 1131
                                                                                                                 // 1132
  if (serviceName === "password" || serviceName === "resume")                                                    // 1133
    throw new Error(                                                                                             // 1134
      "Can't use updateOrCreateUserFromExternalService with internal service "                                   // 1135
        + serviceName);                                                                                          // 1136
  if (!_.has(serviceData, 'id'))                                                                                 // 1137
    throw new Error(                                                                                             // 1138
      "Service data for service " + serviceName + " must include id");                                           // 1139
                                                                                                                 // 1140
  // Look for a user with the appropriate service user id.                                                       // 1141
  var selector = {};                                                                                             // 1142
  var serviceIdKey = "services." + serviceName + ".id";                                                          // 1143
                                                                                                                 // 1144
  // XXX Temporary special case for Twitter. (Issue #629)                                                        // 1145
  //   The serviceData.id will be a string representation of an integer.                                         // 1146
  //   We want it to match either a stored string or int representation.                                         // 1147
  //   This is to cater to earlier versions of Meteor storing twitter                                            // 1148
  //   user IDs in number form, and recent versions storing them as strings.                                     // 1149
  //   This can be removed once migration technology is in place, and twitter                                    // 1150
  //   users stored with integer IDs have been migrated to string IDs.                                           // 1151
  if (serviceName === "twitter" && !isNaN(serviceData.id)) {                                                     // 1152
    selector["$or"] = [{},{}];                                                                                   // 1153
    selector["$or"][0][serviceIdKey] = serviceData.id;                                                           // 1154
    selector["$or"][1][serviceIdKey] = parseInt(serviceData.id, 10);                                             // 1155
  } else {                                                                                                       // 1156
    selector[serviceIdKey] = serviceData.id;                                                                     // 1157
  }                                                                                                              // 1158
                                                                                                                 // 1159
  var user = Meteor.users.findOne(selector);                                                                     // 1160
                                                                                                                 // 1161
  if (user) {                                                                                                    // 1162
    pinEncryptedFieldsToUser(serviceData, user._id);                                                             // 1163
                                                                                                                 // 1164
    // We *don't* process options (eg, profile) for update, but we do replace                                    // 1165
    // the serviceData (eg, so that we keep an unexpired access token and                                        // 1166
    // don't cache old email addresses in serviceData.email).                                                    // 1167
    // XXX provide an onUpdateUser hook which would let apps update                                              // 1168
    //     the profile too                                                                                       // 1169
    var setAttrs = {};                                                                                           // 1170
    _.each(serviceData, function(value, key) {                                                                   // 1171
      setAttrs["services." + serviceName + "." + key] = value;                                                   // 1172
    });                                                                                                          // 1173
                                                                                                                 // 1174
    // XXX Maybe we should re-use the selector above and notice if the update                                    // 1175
    //     touches nothing?                                                                                      // 1176
    Meteor.users.update(user._id, {$set: setAttrs});                                                             // 1177
    return {                                                                                                     // 1178
      type: serviceName,                                                                                         // 1179
      userId: user._id                                                                                           // 1180
    };                                                                                                           // 1181
  } else {                                                                                                       // 1182
    // Create a new user with the service data. Pass other options through to                                    // 1183
    // insertUserDoc.                                                                                            // 1184
    user = {services: {}};                                                                                       // 1185
    user.services[serviceName] = serviceData;                                                                    // 1186
    return {                                                                                                     // 1187
      type: serviceName,                                                                                         // 1188
      userId: Accounts.insertUserDoc(options, user)                                                              // 1189
    };                                                                                                           // 1190
  }                                                                                                              // 1191
};                                                                                                               // 1192
                                                                                                                 // 1193
                                                                                                                 // 1194
///                                                                                                              // 1195
/// PUBLISHING DATA                                                                                              // 1196
///                                                                                                              // 1197
                                                                                                                 // 1198
// Publish the current user's record to the client.                                                              // 1199
Meteor.publish(null, function() {                                                                                // 1200
  if (this.userId) {                                                                                             // 1201
    return Meteor.users.find(                                                                                    // 1202
      {_id: this.userId},                                                                                        // 1203
      {fields: {profile: 1, username: 1, emails: 1}});                                                           // 1204
  } else {                                                                                                       // 1205
    return null;                                                                                                 // 1206
  }                                                                                                              // 1207
}, /*suppress autopublish warning*/{is_auto: true});                                                             // 1208
                                                                                                                 // 1209
// If autopublish is on, publish these user fields. Login service                                                // 1210
// packages (eg accounts-google) add to these by calling                                                         // 1211
// Accounts.addAutopublishFields Notably, this isn't implemented with                                            // 1212
// multiple publishes since DDP only merges only across top-level                                                // 1213
// fields, not subfields (such as 'services.facebook.accessToken')                                               // 1214
var autopublishFields = {                                                                                        // 1215
  loggedInUser: ['profile', 'username', 'emails'],                                                               // 1216
  otherUsers: ['profile', 'username']                                                                            // 1217
};                                                                                                               // 1218
                                                                                                                 // 1219
// Add to the list of fields or subfields to be automatically                                                    // 1220
// published if autopublish is on. Must be called from top-level                                                 // 1221
// code (ie, before Meteor.startup hooks run).                                                                   // 1222
//                                                                                                               // 1223
// @param opts {Object} with:                                                                                    // 1224
//   - forLoggedInUser {Array} Array of fields published to the logged-in user                                   // 1225
//   - forOtherUsers {Array} Array of fields published to users that aren't logged in                            // 1226
Accounts.addAutopublishFields = function(opts) {                                                                 // 1227
  autopublishFields.loggedInUser.push.apply(                                                                     // 1228
    autopublishFields.loggedInUser, opts.forLoggedInUser);                                                       // 1229
  autopublishFields.otherUsers.push.apply(                                                                       // 1230
    autopublishFields.otherUsers, opts.forOtherUsers);                                                           // 1231
};                                                                                                               // 1232
                                                                                                                 // 1233
if (Package.autopublish) {                                                                                       // 1234
  // Use Meteor.startup to give other packages a chance to call                                                  // 1235
  // addAutopublishFields.                                                                                       // 1236
  Meteor.startup(function () {                                                                                   // 1237
    // ['profile', 'username'] -> {profile: 1, username: 1}                                                      // 1238
    var toFieldSelector = function(fields) {                                                                     // 1239
      return _.object(_.map(fields, function(field) {                                                            // 1240
        return [field, 1];                                                                                       // 1241
      }));                                                                                                       // 1242
    };                                                                                                           // 1243
                                                                                                                 // 1244
    Meteor.server.publish(null, function () {                                                                    // 1245
      if (this.userId) {                                                                                         // 1246
        return Meteor.users.find(                                                                                // 1247
          {_id: this.userId},                                                                                    // 1248
          {fields: toFieldSelector(autopublishFields.loggedInUser)});                                            // 1249
      } else {                                                                                                   // 1250
        return null;                                                                                             // 1251
      }                                                                                                          // 1252
    }, /*suppress autopublish warning*/{is_auto: true});                                                         // 1253
                                                                                                                 // 1254
    // XXX this publish is neither dedup-able nor is it optimized by our special                                 // 1255
    // treatment of queries on a specific _id. Therefore this will have O(n^2)                                   // 1256
    // run-time performance every time a user document is changed (eg someone                                    // 1257
    // logging in). If this is a problem, we can instead write a manual publish                                  // 1258
    // function which filters out fields based on 'this.userId'.                                                 // 1259
    Meteor.server.publish(null, function () {                                                                    // 1260
      var selector;                                                                                              // 1261
      if (this.userId)                                                                                           // 1262
        selector = {_id: {$ne: this.userId}};                                                                    // 1263
      else                                                                                                       // 1264
        selector = {};                                                                                           // 1265
                                                                                                                 // 1266
      return Meteor.users.find(                                                                                  // 1267
        selector,                                                                                                // 1268
        {fields: toFieldSelector(autopublishFields.otherUsers)});                                                // 1269
    }, /*suppress autopublish warning*/{is_auto: true});                                                         // 1270
  });                                                                                                            // 1271
}                                                                                                                // 1272
                                                                                                                 // 1273
// Publish all login service configuration fields other than secret.                                             // 1274
Meteor.publish("meteor.loginServiceConfiguration", function () {                                                 // 1275
  var ServiceConfiguration =                                                                                     // 1276
    Package['service-configuration'].ServiceConfiguration;                                                       // 1277
  return ServiceConfiguration.configurations.find({}, {fields: {secret: 0}});                                    // 1278
}, {is_auto: true}); // not techincally autopublish, but stops the warning.                                      // 1279
                                                                                                                 // 1280
// Allow a one-time configuration for a login service. Modifications                                             // 1281
// to this collection are also allowed in insecure mode.                                                         // 1282
Meteor.methods({                                                                                                 // 1283
  "configureLoginService": function (options) {                                                                  // 1284
    check(options, Match.ObjectIncluding({service: String}));                                                    // 1285
    // Don't let random users configure a service we haven't added yet (so                                       // 1286
    // that when we do later add it, it's set up with their configuration                                        // 1287
    // instead of ours).                                                                                         // 1288
    // XXX if service configuration is oauth-specific then this code should                                      // 1289
    //     be in accounts-oauth; if it's not then the registry should be                                         // 1290
    //     in this package                                                                                       // 1291
    if (!(Accounts.oauth                                                                                         // 1292
          && _.contains(Accounts.oauth.serviceNames(), options.service))) {                                      // 1293
      throw new Meteor.Error(403, "Service unknown");                                                            // 1294
    }                                                                                                            // 1295
                                                                                                                 // 1296
    var ServiceConfiguration =                                                                                   // 1297
      Package['service-configuration'].ServiceConfiguration;                                                     // 1298
    if (ServiceConfiguration.configurations.findOne({service: options.service}))                                 // 1299
      throw new Meteor.Error(403, "Service " + options.service + " already configured");                         // 1300
                                                                                                                 // 1301
    if (_.has(options, "secret") && usingOAuthEncryption())                                                      // 1302
      options.secret = OAuthEncryption.seal(options.secret);                                                     // 1303
                                                                                                                 // 1304
    ServiceConfiguration.configurations.insert(options);                                                         // 1305
  }                                                                                                              // 1306
});                                                                                                              // 1307
                                                                                                                 // 1308
                                                                                                                 // 1309
///                                                                                                              // 1310
/// RESTRICTING WRITES TO USER OBJECTS                                                                           // 1311
///                                                                                                              // 1312
                                                                                                                 // 1313
Meteor.users.allow({                                                                                             // 1314
  // clients can modify the profile field of their own document, and                                             // 1315
  // nothing else.                                                                                               // 1316
  update: function (userId, user, fields, modifier) {                                                            // 1317
    // make sure it is our record                                                                                // 1318
    if (user._id !== userId)                                                                                     // 1319
      return false;                                                                                              // 1320
                                                                                                                 // 1321
    // user can only modify the 'profile' field. sets to multiple                                                // 1322
    // sub-keys (eg profile.foo and profile.bar) are merged into entry                                           // 1323
    // in the fields list.                                                                                       // 1324
    if (fields.length !== 1 || fields[0] !== 'profile')                                                          // 1325
      return false;                                                                                              // 1326
                                                                                                                 // 1327
    return true;                                                                                                 // 1328
  },                                                                                                             // 1329
  fetch: ['_id'] // we only look at _id.                                                                         // 1330
});                                                                                                              // 1331
                                                                                                                 // 1332
/// DEFAULT INDEXES ON USERS                                                                                     // 1333
Meteor.users._ensureIndex('username', {unique: 1, sparse: 1});                                                   // 1334
Meteor.users._ensureIndex('emails.address', {unique: 1, sparse: 1});                                             // 1335
Meteor.users._ensureIndex('services.resume.loginTokens.hashedToken',                                             // 1336
                          {unique: 1, sparse: 1});                                                               // 1337
Meteor.users._ensureIndex('services.resume.loginTokens.token',                                                   // 1338
                          {unique: 1, sparse: 1});                                                               // 1339
// For taking care of logoutOtherClients calls that crashed before the tokens                                    // 1340
// were deleted.                                                                                                 // 1341
Meteor.users._ensureIndex('services.resume.haveLoginTokensToDelete',                                             // 1342
                          { sparse: 1 });                                                                        // 1343
// For expiring login tokens                                                                                     // 1344
Meteor.users._ensureIndex("services.resume.loginTokens.when", { sparse: 1 });                                    // 1345
                                                                                                                 // 1346
///                                                                                                              // 1347
/// CLEAN UP FOR `logoutOtherClients`                                                                            // 1348
///                                                                                                              // 1349
                                                                                                                 // 1350
var deleteSavedTokens = function (userId, tokensToDelete) {                                                      // 1351
  if (tokensToDelete) {                                                                                          // 1352
    Meteor.users.update(userId, {                                                                                // 1353
      $unset: {                                                                                                  // 1354
        "services.resume.haveLoginTokensToDelete": 1,                                                            // 1355
        "services.resume.loginTokensToDelete": 1                                                                 // 1356
      },                                                                                                         // 1357
      $pullAll: {                                                                                                // 1358
        "services.resume.loginTokens": tokensToDelete                                                            // 1359
      }                                                                                                          // 1360
    });                                                                                                          // 1361
  }                                                                                                              // 1362
};                                                                                                               // 1363
                                                                                                                 // 1364
Meteor.startup(function () {                                                                                     // 1365
  // If we find users who have saved tokens to delete on startup, delete them                                    // 1366
  // now. It's possible that the server could have crashed and come back up                                      // 1367
  // before new tokens are found in localStorage, but this shouldn't happen very                                 // 1368
  // often. We shouldn't put a delay here because that would give a lot of power                                 // 1369
  // to an attacker with a stolen login token and the ability to crash the                                       // 1370
  // server.                                                                                                     // 1371
  var users = Meteor.users.find({                                                                                // 1372
    "services.resume.haveLoginTokensToDelete": true                                                              // 1373
  }, {                                                                                                           // 1374
    "services.resume.loginTokensToDelete": 1                                                                     // 1375
  });                                                                                                            // 1376
  users.forEach(function (user) {                                                                                // 1377
    deleteSavedTokens(user._id, user.services.resume.loginTokensToDelete);                                       // 1378
  });                                                                                                            // 1379
});                                                                                                              // 1380
                                                                                                                 // 1381
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/accounts-base/url_server.js                                                                          //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
// XXX These should probably not actually be public?                                                             // 1
                                                                                                                 // 2
Accounts.urls = {};                                                                                              // 3
                                                                                                                 // 4
Accounts.urls.resetPassword = function (token) {                                                                 // 5
  return Meteor.absoluteUrl('#/reset-password/' + token);                                                        // 6
};                                                                                                               // 7
                                                                                                                 // 8
Accounts.urls.verifyEmail = function (token) {                                                                   // 9
  return Meteor.absoluteUrl('#/verify-email/' + token);                                                          // 10
};                                                                                                               // 11
                                                                                                                 // 12
Accounts.urls.enrollAccount = function (token) {                                                                 // 13
  return Meteor.absoluteUrl('#/enroll-account/' + token);                                                        // 14
};                                                                                                               // 15
                                                                                                                 // 16
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['accounts-base'] = {
  Accounts: Accounts,
  AccountsTest: AccountsTest
};

})();

//# sourceMappingURL=accounts-base.js.map
