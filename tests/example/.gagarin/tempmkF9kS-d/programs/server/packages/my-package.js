(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;

/* Package-scope variables */
var MyPackage;

(function () {

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/my-package/server.js                                     //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
MyPackage = { where: 'server' };                                     // 1
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

//# sourceMappingURL=my-package.js.map
