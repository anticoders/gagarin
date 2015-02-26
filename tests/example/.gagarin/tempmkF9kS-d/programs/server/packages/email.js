(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var _ = Package.underscore._;
var AppConfig = Package['application-configuration'].AppConfig;

/* Package-scope variables */
var Email, EmailTest;

(function () {

/////////////////////////////////////////////////////////////////////////////////
//                                                                             //
// packages/email/email.js                                                     //
//                                                                             //
/////////////////////////////////////////////////////////////////////////////////
                                                                               //
var Future = Npm.require('fibers/future');                                     // 1
var urlModule = Npm.require('url');                                            // 2
var MailComposer = Npm.require('mailcomposer').MailComposer;                   // 3
                                                                               // 4
Email = {};                                                                    // 5
EmailTest = {};                                                                // 6
                                                                               // 7
var makePool = function (mailUrlString) {                                      // 8
  var mailUrl = urlModule.parse(mailUrlString);                                // 9
  if (mailUrl.protocol !== 'smtp:')                                            // 10
    throw new Error("Email protocol in $MAIL_URL (" +                          // 11
                    mailUrlString + ") must be 'smtp'");                       // 12
                                                                               // 13
  var port = +(mailUrl.port);                                                  // 14
  var auth = false;                                                            // 15
  if (mailUrl.auth) {                                                          // 16
    var parts = mailUrl.auth.split(':', 2);                                    // 17
    auth = {user: parts[0] && decodeURIComponent(parts[0]),                    // 18
            pass: parts[1] && decodeURIComponent(parts[1])};                   // 19
  }                                                                            // 20
                                                                               // 21
  var simplesmtp = Npm.require('simplesmtp');                                  // 22
  var pool = simplesmtp.createClientPool(                                      // 23
    port,  // Defaults to 25                                                   // 24
    mailUrl.hostname,  // Defaults to "localhost"                              // 25
    { secureConnection: (port === 465),                                        // 26
      // XXX allow maxConnections to be configured?                            // 27
      auth: auth });                                                           // 28
                                                                               // 29
  pool._future_wrapped_sendMail = _.bind(Future.wrap(pool.sendMail), pool);    // 30
  return pool;                                                                 // 31
};                                                                             // 32
                                                                               // 33
// We construct smtpPool at the first call to Email.send, so that              // 34
// Meteor.startup code can set $MAIL_URL.                                      // 35
var smtpPoolFuture = new Future;;                                              // 36
var configured = false;                                                        // 37
                                                                               // 38
var getPool = function () {                                                    // 39
  // We check MAIL_URL in case someone else set it in Meteor.startup code.     // 40
  if (!configured) {                                                           // 41
    configured = true;                                                         // 42
    AppConfig.configurePackage('email', function (config) {                    // 43
      // XXX allow reconfiguration when the app config changes                 // 44
      if (smtpPoolFuture.isResolved())                                         // 45
        return;                                                                // 46
      var url = config.url || process.env.MAIL_URL;                            // 47
      var pool = null;                                                         // 48
      if (url)                                                                 // 49
        pool = makePool(url);                                                  // 50
      smtpPoolFuture.return(pool);                                             // 51
    });                                                                        // 52
  }                                                                            // 53
                                                                               // 54
  return smtpPoolFuture.wait();                                                // 55
};                                                                             // 56
                                                                               // 57
var next_devmode_mail_id = 0;                                                  // 58
var output_stream = process.stdout;                                            // 59
                                                                               // 60
// Testing hooks                                                               // 61
EmailTest.overrideOutputStream = function (stream) {                           // 62
  next_devmode_mail_id = 0;                                                    // 63
  output_stream = stream;                                                      // 64
};                                                                             // 65
                                                                               // 66
EmailTest.restoreOutputStream = function () {                                  // 67
  output_stream = process.stdout;                                              // 68
};                                                                             // 69
                                                                               // 70
var devModeSend = function (mc) {                                              // 71
  var devmode_mail_id = next_devmode_mail_id++;                                // 72
                                                                               // 73
  var stream = output_stream;                                                  // 74
                                                                               // 75
  // This approach does not prevent other writers to stdout from interleaving. // 76
  stream.write("====== BEGIN MAIL #" + devmode_mail_id + " ======\n");         // 77
  stream.write("(Mail not sent; to enable sending, set the MAIL_URL " +        // 78
               "environment variable.)\n");                                    // 79
  mc.streamMessage();                                                          // 80
  mc.pipe(stream, {end: false});                                               // 81
  var future = new Future;                                                     // 82
  mc.on('end', function () {                                                   // 83
    stream.write("====== END MAIL #" + devmode_mail_id + " ======\n");         // 84
    future['return']();                                                        // 85
  });                                                                          // 86
  future.wait();                                                               // 87
};                                                                             // 88
                                                                               // 89
var smtpSend = function (pool, mc) {                                           // 90
  pool._future_wrapped_sendMail(mc).wait();                                    // 91
};                                                                             // 92
                                                                               // 93
/**                                                                            // 94
 * Mock out email sending (eg, during a test.) This is private for now.        // 95
 *                                                                             // 96
 * f receives the arguments to Email.send and should return true to go         // 97
 * ahead and send the email (or at least, try subsequent hooks), or            // 98
 * false to skip sending.                                                      // 99
 */                                                                            // 100
var sendHooks = [];                                                            // 101
EmailTest.hookSend = function (f) {                                            // 102
  sendHooks.push(f);                                                           // 103
};                                                                             // 104
                                                                               // 105
// Old comment below                                                           // 106
/**                                                                            // 107
 * Send an email.                                                              // 108
 *                                                                             // 109
 * Connects to the mail server configured via the MAIL_URL environment         // 110
 * variable. If unset, prints formatted message to stdout. The "from" option   // 111
 * is required, and at least one of "to", "cc", and "bcc" must be provided;    // 112
 * all other options are optional.                                             // 113
 *                                                                             // 114
 * @param options                                                              // 115
 * @param options.from {String} RFC5322 "From:" address                        // 116
 * @param options.to {String|String[]} RFC5322 "To:" address[es]               // 117
 * @param options.cc {String|String[]} RFC5322 "Cc:" address[es]               // 118
 * @param options.bcc {String|String[]} RFC5322 "Bcc:" address[es]             // 119
 * @param options.replyTo {String|String[]} RFC5322 "Reply-To:" address[es]    // 120
 * @param options.subject {String} RFC5322 "Subject:" line                     // 121
 * @param options.text {String} RFC5322 mail body (plain text)                 // 122
 * @param options.html {String} RFC5322 mail body (HTML)                       // 123
 * @param options.headers {Object} custom RFC5322 headers (dictionary)         // 124
 */                                                                            // 125
                                                                               // 126
// New API doc comment below                                                   // 127
/**                                                                            // 128
 * @summary Send an email. Throws an `Error` on failure to contact mail server // 129
 * or if mail server returns an error. All fields should match                 // 130
 * [RFC5322](http://tools.ietf.org/html/rfc5322) specification.                // 131
 * @locus Server                                                               // 132
 * @param {Object} options                                                     // 133
 * @param {String} options.from "From:" address (required)                     // 134
 * @param {String|String[]} options.to,cc,bcc,replyTo                          // 135
 *   "To:", "Cc:", "Bcc:", and "Reply-To:" addresses                           // 136
 * @param {String} [options.subject]  "Subject:" line                          // 137
 * @param {String} [options.text|html] Mail body (in plain text or HTML)       // 138
 * @param {Object} [options.headers] Dictionary of custom headers              // 139
 */                                                                            // 140
Email.send = function (options) {                                              // 141
  for (var i = 0; i < sendHooks.length; i++)                                   // 142
    if (! sendHooks[i](options))                                               // 143
      return;                                                                  // 144
                                                                               // 145
  var mc = new MailComposer();                                                 // 146
                                                                               // 147
  // setup message data                                                        // 148
  // XXX support attachments (once we have a client/server-compatible binary   // 149
  //     Buffer class)                                                         // 150
  mc.setMessageOption({                                                        // 151
    from: options.from,                                                        // 152
    to: options.to,                                                            // 153
    cc: options.cc,                                                            // 154
    bcc: options.bcc,                                                          // 155
    replyTo: options.replyTo,                                                  // 156
    subject: options.subject,                                                  // 157
    text: options.text,                                                        // 158
    html: options.html                                                         // 159
  });                                                                          // 160
                                                                               // 161
  _.each(options.headers, function (value, name) {                             // 162
    mc.addHeader(name, value);                                                 // 163
  });                                                                          // 164
                                                                               // 165
  var pool = getPool();                                                        // 166
  if (pool) {                                                                  // 167
    smtpSend(pool, mc);                                                        // 168
  } else {                                                                     // 169
    devModeSend(mc);                                                           // 170
  }                                                                            // 171
};                                                                             // 172
                                                                               // 173
/////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package.email = {
  Email: Email,
  EmailTest: EmailTest
};

})();

//# sourceMappingURL=email.js.map
