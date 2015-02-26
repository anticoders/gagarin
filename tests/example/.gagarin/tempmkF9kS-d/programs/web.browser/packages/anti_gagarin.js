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
var _ = Package.underscore._;
var Mongo = Package.mongo.Mongo;

/* Package-scope variables */
var Gagarin;

(function () {

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/anti:gagarin/meteor/gagarin.js                           //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
                                                                     // 1
var settings = Meteor.settings && Meteor.settings.gagarin;           // 2
                                                                     // 3
if (Package['anti:gagarin']) { // it might get created by a fixture  // 4
  Gagarin = Package['anti:gagarin'].Gagarin;                         // 5
} else {                                                             // 6
  Gagarin = {};                                                      // 7
}                                                                    // 8
                                                                     // 9
Gagarin.isActive = !!settings;                                       // 10
                                                                     // 11
if (Gagarin.isActive) {                                              // 12
  Gagarin.settings = settings;                                       // 13
}                                                                    // 14
                                                                     // 15
///////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['anti:gagarin'] = {
  Gagarin: Gagarin
};

})();
