(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;

/* Package-scope variables */
var NpmModuleBcrypt;

(function () {

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/npm-bcrypt/wrapper.js                                    //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
NpmModuleBcrypt = Npm.require('bcrypt');                             // 1
                                                                     // 2
///////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['npm-bcrypt'] = {
  NpmModuleBcrypt: NpmModuleBcrypt
};

})();

//# sourceMappingURL=npm-bcrypt.js.map
