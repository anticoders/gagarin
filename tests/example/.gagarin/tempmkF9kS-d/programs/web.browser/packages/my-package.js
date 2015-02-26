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

/* Package-scope variables */
var MyPackage;

(function () {

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/my-package/client.js                                     //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
MyPackage = { where: 'client' };                                     // 1
                                                                     // 2
var thisIsSomePrivateVariable = 0;                                   // 3
                                                                     // 4
MyPackage.doSomething = function (value) {                           // 5
  thisIsSomePrivateVariable += value;                                // 6
  return thisIsSomePrivateVariable;                                  // 7
}                                                                    // 8
                                                                     // 9
///////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['my-package'] = {
  MyPackage: MyPackage
};

})();
