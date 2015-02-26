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
var Mongo = Package.mongo.Mongo;

/* Package-scope variables */
var ServiceConfiguration;

(function () {

////////////////////////////////////////////////////////////////////////////////////////
//                                                                                    //
// packages/service-configuration/service_configuration_common.js                     //
//                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////
                                                                                      //
if (typeof ServiceConfiguration === 'undefined') {                                    // 1
  ServiceConfiguration = {};                                                          // 2
}                                                                                     // 3
                                                                                      // 4
                                                                                      // 5
// Table containing documents with configuration options for each                     // 6
// login service                                                                      // 7
ServiceConfiguration.configurations = new Mongo.Collection(                           // 8
  "meteor_accounts_loginServiceConfiguration", {                                      // 9
    _preventAutopublish: true,                                                        // 10
    connection: Meteor.isClient ? Accounts.connection : Meteor.connection             // 11
  });                                                                                 // 12
// Leave this collection open in insecure mode. In theory, someone could              // 13
// hijack your oauth connect requests to a different endpoint or appId,               // 14
// but you did ask for 'insecure'. The advantage is that it is much                   // 15
// easier to write a configuration wizard that works only in insecure                 // 16
// mode.                                                                              // 17
                                                                                      // 18
                                                                                      // 19
// Thrown when trying to use a login service which is not configured                  // 20
ServiceConfiguration.ConfigError = function (serviceName) {                           // 21
  if (Meteor.isClient && !Accounts.loginServicesConfigured()) {                       // 22
    this.message = "Login service configuration not yet loaded";                      // 23
  } else if (serviceName) {                                                           // 24
    this.message = "Service " + serviceName + " not configured";                      // 25
  } else {                                                                            // 26
    this.message = "Service not configured";                                          // 27
  }                                                                                   // 28
};                                                                                    // 29
ServiceConfiguration.ConfigError.prototype = new Error();                             // 30
ServiceConfiguration.ConfigError.prototype.name = 'ServiceConfiguration.ConfigError'; // 31
                                                                                      // 32
////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['service-configuration'] = {
  ServiceConfiguration: ServiceConfiguration
};

})();
