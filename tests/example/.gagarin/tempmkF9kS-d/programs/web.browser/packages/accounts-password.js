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
var Accounts = Package['accounts-base'].Accounts;
var SRP = Package.srp.SRP;
var SHA256 = Package.sha.SHA256;
var check = Package.check.check;
var Match = Package.check.Match;
var _ = Package.underscore._;
var DDP = Package.ddp.DDP;

(function () {

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                            //
// packages/accounts-password/password_client.js                                                              //
//                                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                              //
// Attempt to log in with a password.                                                                         // 1
//                                                                                                            // 2
// @param selector {String|Object} One of the following:                                                      // 3
//   - {username: (username)}                                                                                 // 4
//   - {email: (email)}                                                                                       // 5
//   - a string which may be a username or email, depending on whether                                        // 6
//     it contains "@".                                                                                       // 7
// @param password {String}                                                                                   // 8
// @param callback {Function(error|undefined)}                                                                // 9
                                                                                                              // 10
/**                                                                                                           // 11
 * @summary Log the user in with a password.                                                                  // 12
 * @locus Client                                                                                              // 13
 * @param {Object | String} user Either a string interpreted as a username or an email; or an object with a single key: `email`, `username` or `id`.
 * @param {String} password The user's password.                                                              // 15
 * @param {Function} [callback] Optional callback. Called with no arguments on success, or with a single `Error` argument on failure.
 */                                                                                                           // 17
Meteor.loginWithPassword = function (selector, password, callback) {                                          // 18
  if (typeof selector === 'string')                                                                           // 19
    if (selector.indexOf('@') === -1)                                                                         // 20
      selector = {username: selector};                                                                        // 21
    else                                                                                                      // 22
      selector = {email: selector};                                                                           // 23
                                                                                                              // 24
  Accounts.callLoginMethod({                                                                                  // 25
    methodArguments: [{                                                                                       // 26
      user: selector,                                                                                         // 27
      password: Accounts._hashPassword(password)                                                              // 28
    }],                                                                                                       // 29
    userCallback: function (error, result) {                                                                  // 30
      if (error && error.error === 400 &&                                                                     // 31
          error.reason === 'old password format') {                                                           // 32
        // The "reason" string should match the error thrown in the                                           // 33
        // password login handler in password_server.js.                                                      // 34
                                                                                                              // 35
        // XXX COMPAT WITH 0.8.1.3                                                                            // 36
        // If this user's last login was with a previous version of                                           // 37
        // Meteor that used SRP, then the server throws this error to                                         // 38
        // indicate that we should try again. The error includes the                                          // 39
        // user's SRP identity. We provide a value derived from the                                           // 40
        // identity and the password to prove to the server that we know                                      // 41
        // the password without requiring a full SRP flow, as well as                                         // 42
        // SHA256(password), which the server bcrypts and stores in                                           // 43
        // place of the old SRP information for this user.                                                    // 44
        srpUpgradePath({                                                                                      // 45
          upgradeError: error,                                                                                // 46
          userSelector: selector,                                                                             // 47
          plaintextPassword: password                                                                         // 48
        }, callback);                                                                                         // 49
      }                                                                                                       // 50
      else if (error) {                                                                                       // 51
        callback && callback(error);                                                                          // 52
      } else {                                                                                                // 53
        callback && callback();                                                                               // 54
      }                                                                                                       // 55
    }                                                                                                         // 56
  });                                                                                                         // 57
};                                                                                                            // 58
                                                                                                              // 59
Accounts._hashPassword = function (password) {                                                                // 60
  return {                                                                                                    // 61
    digest: SHA256(password),                                                                                 // 62
    algorithm: "sha-256"                                                                                      // 63
  };                                                                                                          // 64
};                                                                                                            // 65
                                                                                                              // 66
// XXX COMPAT WITH 0.8.1.3                                                                                    // 67
// The server requested an upgrade from the old SRP password format,                                          // 68
// so supply the needed SRP identity to login. Options:                                                       // 69
//   - upgradeError: the error object that the server returned to tell                                        // 70
//     us to upgrade from SRP to bcrypt.                                                                      // 71
//   - userSelector: selector to retrieve the user object                                                     // 72
//   - plaintextPassword: the password as a string                                                            // 73
var srpUpgradePath = function (options, callback) {                                                           // 74
  var details;                                                                                                // 75
  try {                                                                                                       // 76
    details = EJSON.parse(options.upgradeError.details);                                                      // 77
  } catch (e) {}                                                                                              // 78
  if (!(details && details.format === 'srp')) {                                                               // 79
    callback && callback(                                                                                     // 80
      new Meteor.Error(400, "Password is old. Please reset your " +                                           // 81
                       "password."));                                                                         // 82
  } else {                                                                                                    // 83
    Accounts.callLoginMethod({                                                                                // 84
      methodArguments: [{                                                                                     // 85
        user: options.userSelector,                                                                           // 86
        srp: SHA256(details.identity + ":" + options.plaintextPassword),                                      // 87
        password: Accounts._hashPassword(options.plaintextPassword)                                           // 88
      }],                                                                                                     // 89
      userCallback: callback                                                                                  // 90
    });                                                                                                       // 91
  }                                                                                                           // 92
};                                                                                                            // 93
                                                                                                              // 94
                                                                                                              // 95
// Attempt to log in as a new user.                                                                           // 96
                                                                                                              // 97
/**                                                                                                           // 98
 * @summary Create a new user.                                                                                // 99
 * @locus Anywhere                                                                                            // 100
 * @param {Object} options                                                                                    // 101
 * @param {String} options.username A unique name for this user.                                              // 102
 * @param {String} options.email The user's email address.                                                    // 103
 * @param {String} options.password The user's password. This is __not__ sent in plain text over the wire.    // 104
 * @param {Object} options.profile The user's profile, typically including the `name` field.                  // 105
 * @param {Function} [callback] Client only, optional callback. Called with no arguments on success, or with a single `Error` argument on failure.
 */                                                                                                           // 107
Accounts.createUser = function (options, callback) {                                                          // 108
  options = _.clone(options); // we'll be modifying options                                                   // 109
                                                                                                              // 110
  if (typeof options.password !== 'string')                                                                   // 111
    throw new Error("Must set options.password");                                                             // 112
  if (!options.password) {                                                                                    // 113
    callback(new Meteor.Error(400, "Password may not be empty"));                                             // 114
    return;                                                                                                   // 115
  }                                                                                                           // 116
                                                                                                              // 117
  // Replace password with the hashed password.                                                               // 118
  options.password = Accounts._hashPassword(options.password);                                                // 119
                                                                                                              // 120
  Accounts.callLoginMethod({                                                                                  // 121
    methodName: 'createUser',                                                                                 // 122
    methodArguments: [options],                                                                               // 123
    userCallback: callback                                                                                    // 124
  });                                                                                                         // 125
};                                                                                                            // 126
                                                                                                              // 127
                                                                                                              // 128
                                                                                                              // 129
// Change password. Must be logged in.                                                                        // 130
//                                                                                                            // 131
// @param oldPassword {String|null} By default servers no longer allow                                        // 132
//   changing password without the old password, but they could so we                                         // 133
//   support passing no password to the server and letting it decide.                                         // 134
// @param newPassword {String}                                                                                // 135
// @param callback {Function(error|undefined)}                                                                // 136
                                                                                                              // 137
/**                                                                                                           // 138
 * @summary Change the current user's password. Must be logged in.                                            // 139
 * @locus Client                                                                                              // 140
 * @param {String} oldPassword The user's current password. This is __not__ sent in plain text over the wire. // 141
 * @param {String} newPassword A new password for the user. This is __not__ sent in plain text over the wire. // 142
 * @param {Function} [callback] Optional callback. Called with no arguments on success, or with a single `Error` argument on failure.
 */                                                                                                           // 144
Accounts.changePassword = function (oldPassword, newPassword, callback) {                                     // 145
  if (!Meteor.user()) {                                                                                       // 146
    callback && callback(new Error("Must be logged in to change password."));                                 // 147
    return;                                                                                                   // 148
  }                                                                                                           // 149
                                                                                                              // 150
  check(newPassword, String);                                                                                 // 151
  if (!newPassword) {                                                                                         // 152
    callback(new Meteor.Error(400, "Password may not be empty"));                                             // 153
    return;                                                                                                   // 154
  }                                                                                                           // 155
                                                                                                              // 156
  Accounts.connection.apply(                                                                                  // 157
    'changePassword',                                                                                         // 158
    [oldPassword ? Accounts._hashPassword(oldPassword) : null,                                                // 159
     Accounts._hashPassword(newPassword)],                                                                    // 160
    function (error, result) {                                                                                // 161
      if (error || !result) {                                                                                 // 162
        if (error && error.error === 400 &&                                                                   // 163
            error.reason === 'old password format') {                                                         // 164
          // XXX COMPAT WITH 0.8.1.3                                                                          // 165
          // The server is telling us to upgrade from SRP to bcrypt, as                                       // 166
          // in Meteor.loginWithPassword.                                                                     // 167
          srpUpgradePath({                                                                                    // 168
            upgradeError: error,                                                                              // 169
            userSelector: { id: Meteor.userId() },                                                            // 170
            plaintextPassword: oldPassword                                                                    // 171
          }, function (err) {                                                                                 // 172
            if (err) {                                                                                        // 173
              callback && callback(err);                                                                      // 174
            } else {                                                                                          // 175
              // Now that we've successfully migrated from srp to                                             // 176
              // bcrypt, try changing the password again.                                                     // 177
              Accounts.changePassword(oldPassword, newPassword, callback);                                    // 178
            }                                                                                                 // 179
          });                                                                                                 // 180
        } else {                                                                                              // 181
          // A normal error, not an error telling us to upgrade to bcrypt                                     // 182
          callback && callback(                                                                               // 183
            error || new Error("No result from changePassword."));                                            // 184
        }                                                                                                     // 185
      } else {                                                                                                // 186
        callback && callback();                                                                               // 187
      }                                                                                                       // 188
    }                                                                                                         // 189
  );                                                                                                          // 190
};                                                                                                            // 191
                                                                                                              // 192
// Sends an email to a user with a link that can be used to reset                                             // 193
// their password                                                                                             // 194
//                                                                                                            // 195
// @param options {Object}                                                                                    // 196
//   - email: (email)                                                                                         // 197
// @param callback (optional) {Function(error|undefined)}                                                     // 198
                                                                                                              // 199
/**                                                                                                           // 200
 * @summary Request a forgot password email.                                                                  // 201
 * @locus Client                                                                                              // 202
 * @param {Object} options                                                                                    // 203
 * @param {String} options.email The email address to send a password reset link.                             // 204
 * @param {Function} [callback] Optional callback. Called with no arguments on success, or with a single `Error` argument on failure.
 */                                                                                                           // 206
Accounts.forgotPassword = function(options, callback) {                                                       // 207
  if (!options.email)                                                                                         // 208
    throw new Error("Must pass options.email");                                                               // 209
  Accounts.connection.call("forgotPassword", options, callback);                                              // 210
};                                                                                                            // 211
                                                                                                              // 212
// Resets a password based on a token originally created by                                                   // 213
// Accounts.forgotPassword, and then logs in the matching user.                                               // 214
//                                                                                                            // 215
// @param token {String}                                                                                      // 216
// @param newPassword {String}                                                                                // 217
// @param callback (optional) {Function(error|undefined)}                                                     // 218
                                                                                                              // 219
/**                                                                                                           // 220
 * @summary Reset the password for a user using a token received in email. Logs the user in afterwards.       // 221
 * @locus Client                                                                                              // 222
 * @param {String} token The token retrieved from the reset password URL.                                     // 223
 * @param {String} newPassword A new password for the user. This is __not__ sent in plain text over the wire. // 224
 * @param {Function} [callback] Optional callback. Called with no arguments on success, or with a single `Error` argument on failure.
 */                                                                                                           // 226
Accounts.resetPassword = function(token, newPassword, callback) {                                             // 227
  check(token, String);                                                                                       // 228
  check(newPassword, String);                                                                                 // 229
                                                                                                              // 230
  if (!newPassword) {                                                                                         // 231
    callback(new Meteor.Error(400, "Password may not be empty"));                                             // 232
    return;                                                                                                   // 233
  }                                                                                                           // 234
                                                                                                              // 235
  Accounts.callLoginMethod({                                                                                  // 236
    methodName: 'resetPassword',                                                                              // 237
    methodArguments: [token, Accounts._hashPassword(newPassword)],                                            // 238
    userCallback: callback});                                                                                 // 239
};                                                                                                            // 240
                                                                                                              // 241
// Verifies a user's email address based on a token originally                                                // 242
// created by Accounts.sendVerificationEmail                                                                  // 243
//                                                                                                            // 244
// @param token {String}                                                                                      // 245
// @param callback (optional) {Function(error|undefined)}                                                     // 246
                                                                                                              // 247
/**                                                                                                           // 248
 * @summary Marks the user's email address as verified. Logs the user in afterwards.                          // 249
 * @locus Client                                                                                              // 250
 * @param {String} token The token retrieved from the verification URL.                                       // 251
 * @param {Function} [callback] Optional callback. Called with no arguments on success, or with a single `Error` argument on failure.
 */                                                                                                           // 253
Accounts.verifyEmail = function(token, callback) {                                                            // 254
  if (!token)                                                                                                 // 255
    throw new Error("Need to pass token");                                                                    // 256
                                                                                                              // 257
  Accounts.callLoginMethod({                                                                                  // 258
    methodName: 'verifyEmail',                                                                                // 259
    methodArguments: [token],                                                                                 // 260
    userCallback: callback});                                                                                 // 261
};                                                                                                            // 262
                                                                                                              // 263
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['accounts-password'] = {};

})();
