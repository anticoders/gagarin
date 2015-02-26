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
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var Session = Package.session.Session;
var Template = Package.templating.Template;
var Blaze = Package.blaze.Blaze;
var UI = Package.blaze.UI;
var Handlebars = Package.blaze.Handlebars;
var HTML = Package.htmljs.HTML;

(function () {

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/mystor:device-detection/device_detection.js                                                          //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
(function() {                                                                                                    // 1
  var Device = function() {                                                                                      // 2
    // Constructor                                                                                               // 3
    this._deps = new Deps.Dependency;                                                                            // 4
    this._type = 'desktop';                                                                                      // 5
                                                                                                                 // 6
    this._suffix_deps = {                                                                                        // 7
      tv: new Deps.Dependency,                                                                                   // 8
      tablet: new Deps.Dependency,                                                                               // 9
      phone: new Deps.Dependency,                                                                                // 10
      desktop: new Deps.Dependency,                                                                              // 11
      bot: new Deps.Dependency                                                                                   // 12
    }                                                                                                            // 13
                                                                                                                 // 14
    this._suffix = {                                                                                             // 15
      tv: '_tv',                                                                                                 // 16
      tablet: '_tablet',                                                                                         // 17
      phone: '_phone',                                                                                           // 18
      desktop: '_desktop',                                                                                       // 19
      bot: '_bot'                                                                                                // 20
    }                                                                                                            // 21
                                                                                                                 // 22
    this.emptyUserAgentDeviceType = 'desktop';                                                                   // 23
    this.botUserAgentDeviceType = 'bot';                                                                         // 24
    this.unknownUserAgentDeviceType = 'phone';                                                                   // 25
                                                                                                                 // 26
    Session.setDefault('devices_user_type_preference', 'no_preference');                                         // 27
  };                                                                                                             // 28
                                                                                                                 // 29
  /*                                                                                                             // 30
   * Setting Suffixes                                                                                            // 31
   */                                                                                                            // 32
  Device.prototype.setSuffix = function(type, suffix) {                                                          // 33
    this._suffix[type] = suffix;                                                                                 // 34
    this._suffix_deps[type].changed();                                                                           // 35
  }                                                                                                              // 36
                                                                                                                 // 37
  // Helper Functions                                                                                            // 38
  Device.prototype.setTVSuffix = function(suffix) {                                                              // 39
    this.setSuffix('tv', suffix);                                                                                // 40
  }                                                                                                              // 41
                                                                                                                 // 42
  Device.prototype.setTabletSuffix = function(suffix) {                                                          // 43
    this.setSuffix('tablet', suffix);                                                                            // 44
  }                                                                                                              // 45
                                                                                                                 // 46
  Device.prototype.setPhoneSuffix = function(suffix) {                                                           // 47
    this.setSuffix('phone', suffix);                                                                             // 48
  }                                                                                                              // 49
                                                                                                                 // 50
  Device.prototype.setDesktopSuffix = function(suffix) {                                                         // 51
    this.setSuffix('desktop', suffix);                                                                           // 52
  }                                                                                                              // 53
                                                                                                                 // 54
  Device.prototype.setBotSuffix = function(suffix) {                                                             // 55
    this.setSuffix('bot', suffix);                                                                               // 56
  }                                                                                                              // 57
                                                                                                                 // 58
  /*                                                                                                             // 59
   * Getting Suffixes                                                                                            // 60
   */                                                                                                            // 61
  Device.prototype.getSuffix = function(type) {                                                                  // 62
    this._suffix_deps[type].depend();                                                                            // 63
    return this._suffix[type];                                                                                   // 64
  }                                                                                                              // 65
                                                                                                                 // 66
  // Helper Functions                                                                                            // 67
  Device.prototype.TVSuffix = function() {                                                                       // 68
    return getSuffix('tv');                                                                                      // 69
  }                                                                                                              // 70
                                                                                                                 // 71
  Device.prototype.TabletSuffix = function() {                                                                   // 72
    return getSuffix('tablet');                                                                                  // 73
  }                                                                                                              // 74
                                                                                                                 // 75
  Device.prototype.PhoneSuffix = function() {                                                                    // 76
    return getSuffix('phone');                                                                                   // 77
  }                                                                                                              // 78
                                                                                                                 // 79
  Device.prototype.DesktopSuffix = function() {                                                                  // 80
    return getSuffix('desktop');                                                                                 // 81
  }                                                                                                              // 82
                                                                                                                 // 83
  Device.prototype.BotSuffix = function() {                                                                      // 84
    return getSuffix('bot');                                                                                     // 85
  }                                                                                                              // 86
                                                                                                                 // 87
  /*                                                                                                             // 88
   * Setting Preferences                                                                                         // 89
   */                                                                                                            // 90
  Device.prototype.setPreference = function(type) {                                                              // 91
    this._type = type;                                                                                           // 92
    Session.set('devices_user_type_preference', type);                                                           // 93
    this._deps.changed();                                                                                        // 94
  }                                                                                                              // 95
                                                                                                                 // 96
  Device.prototype.hasPreference = function() {                                                                  // 97
    return !Session.equals('devices_user_type_preference', 'no_preference');                                     // 98
  }                                                                                                              // 99
                                                                                                                 // 100
  // Helper Functions                                                                                            // 101
  Device.prototype.clearPreference = function() {                                                                // 102
    this.setPreference('no_preference');                                                                         // 103
    this.detectDevice();                                                                                         // 104
  }                                                                                                              // 105
                                                                                                                 // 106
  Device.prototype.preferTV = function() {                                                                       // 107
    this.setPreference('tv');                                                                                    // 108
  }                                                                                                              // 109
                                                                                                                 // 110
  Device.prototype.preferTablet = function() {                                                                   // 111
    this.setPreference('tablet');                                                                                // 112
  }                                                                                                              // 113
                                                                                                                 // 114
  Device.prototype.preferPhone = function() {                                                                    // 115
    this.setPreference('phone');                                                                                 // 116
  }                                                                                                              // 117
                                                                                                                 // 118
  Device.prototype.preferDesktop = function() {                                                                  // 119
    this.setPreference('desktop');                                                                               // 120
  }                                                                                                              // 121
                                                                                                                 // 122
  Device.prototype.preferBot = function() {                                                                      // 123
    this.setPreference('bot');                                                                                   // 124
  }                                                                                                              // 125
                                                                                                                 // 126
  /*                                                                                                             // 127
   * Getting Type                                                                                                // 128
   */                                                                                                            // 129
  Device.prototype.type = function() {                                                                           // 130
    this._deps.depend();                                                                                         // 131
    return this._type;                                                                                           // 132
  }                                                                                                              // 133
                                                                                                                 // 134
  Device.prototype.isType = function(type) {                                                                     // 135
    return type === this.type();                                                                                 // 136
  }                                                                                                              // 137
                                                                                                                 // 138
  // Helper Functions                                                                                            // 139
  Device.prototype.isTV = function() {                                                                           // 140
    return this.isType('tv');                                                                                    // 141
  };                                                                                                             // 142
                                                                                                                 // 143
  Device.prototype.isTablet = function() {                                                                       // 144
    return this.isType('tablet');                                                                                // 145
  };                                                                                                             // 146
                                                                                                                 // 147
  Device.prototype.isPhone = function() {                                                                        // 148
    return this.isType('phone');                                                                                 // 149
  };                                                                                                             // 150
                                                                                                                 // 151
  Device.prototype.isDesktop = function() {                                                                      // 152
    return this.isType('desktop');                                                                               // 153
  };                                                                                                             // 154
                                                                                                                 // 155
  Device.prototype.isBot = function() {                                                                          // 156
    return this.isType('bot');                                                                                   // 157
  };                                                                                                             // 158
                                                                                                                 // 159
  /*                                                                                                             // 160
   * Automatically detect the type                                                                               // 161
   * Run when code first executes, can be run again later.                                                       // 162
   * This will not overwrite user preferences                                                                    // 163
   */                                                                                                            // 164
  Device.prototype.detectDevice = function() {                                                                   // 165
    if (!Session.equals('devices_user_type_preference', 'no_preference')) {                                      // 166
      // Don't override the user's preferences                                                                   // 167
      this._type = Session.get('devices_user_type_preference');                                                  // 168
      this._deps.changed();                                                                                      // 169
      return;                                                                                                    // 170
    }                                                                                                            // 171
                                                                                                                 // 172
    var ua = navigator.userAgent;                                                                                // 173
    var options = this;                                                                                          // 174
                                                                                                                 // 175
    this._type = (function() {                                                                                   // 176
      if (!ua || ua === '') {                                                                                    // 177
        // No user agent                                                                                         // 178
        return options.emptyUserAgentDeviceType||'desktop';                                                      // 179
      }                                                                                                          // 180
                                                                                                                 // 181
      if (ua.match(/GoogleTV|SmartTV|Internet TV|NetCast|NETTV|AppleTV|boxee|Kylo|Roku|DLNADOC|CE\-HTML/i)) {    // 182
        // if user agent is a smart TV - http://goo.gl/FocDk                                                     // 183
        return 'tv';                                                                                             // 184
      } else if (ua.match(/Xbox|PLAYSTATION 3|Wii/i)) {                                                          // 185
        // if user agent is a TV Based Gaming Console                                                            // 186
        return 'tv';                                                                                             // 187
      } else if (ua.match(/iP(a|ro)d/i) || (ua.match(/tablet/i) && !ua.match(/RX-34/i)) || ua.match(/FOLIO/i)) { // 188
        // if user agent is a Tablet                                                                             // 189
        return 'tablet';                                                                                         // 190
      } else if (ua.match(/Linux/i) && ua.match(/Android/i) && !ua.match(/Fennec|mobi|HTC Magic|HTCX06HT|Nexus One|SC-02B|fone 945/i)) {
        // if user agent is an Android Tablet                                                                    // 192
        return 'tablet';                                                                                         // 193
      } else if (ua.match(/Kindle/i) || (ua.match(/Mac OS/i) && ua.match(/Silk/i))) {                            // 194
        // if user agent is a Kindle or Kindle Fire                                                              // 195
        return 'tablet';                                                                                         // 196
      } else if (ua.match(/GT-P10|SC-01C|SHW-M180S|SGH-T849|SCH-I800|SHW-M180L|SPH-P100|SGH-I987|zt180|HTC( Flyer|_Flyer)|Sprint ATP51|ViewPad7|pandigital(sprnova|nova)|Ideos S7|Dell Streak 7|Advent Vega|A101IT|A70BHT|MID7015|Next2|nook/i) || (ua.match(/MB511/i) && ua.match(/RUTEM/i))) {
        // if user agent is a pre Android 3.0 Tablet                                                             // 198
        return 'tablet';                                                                                         // 199
      } else if (ua.match(/BOLT|Fennec|Iris|Maemo|Minimo|Mobi|mowser|NetFront|Novarra|Prism|RX-34|Skyfire|Tear|XV6875|XV6975|Google Wireless Transcoder/i)) {
        // if user agent is unique mobile User Agent                                                             // 201
        return 'phone';                                                                                          // 202
      } else if (ua.match(/Opera/i) && ua.match(/Windows NT 5/i) && ua.match(/HTC|Xda|Mini|Vario|SAMSUNG\-GT\-i8000|SAMSUNG\-SGH\-i9/i)) {
        // if user agent is an odd Opera User Agent - http://goo.gl/nK90K                                        // 204
        return 'phone';                                                                                          // 205
      } else if ((ua.match(/Windows (NT|XP|ME|9)/) && !ua.match(/Phone/i)) && !ua.match(/Bot|Spider|ia_archiver|NewsGator/i) || ua.match(/Win( ?9|NT)/i)) {
        // if user agent is Windows Desktop                                                                      // 207
        return 'desktop';                                                                                        // 208
      } else if (ua.match(/Macintosh|PowerPC/i) && !ua.match(/Silk/i)) {                                         // 209
        // if agent is Mac Desktop                                                                               // 210
        return 'desktop';                                                                                        // 211
      } else if (ua.match(/Linux/i) && ua.match(/X11/i) && !ua.match(/Charlotte/i)) {                            // 212
        // if user agent is a Linux Desktop                                                                      // 213
        return 'desktop';                                                                                        // 214
      } else if (ua.match(/CrOS/)) {                                                                             // 215
        // if user agent is a Chrome Book                                                                        // 216
        return 'desktop';                                                                                        // 217
      } else if (ua.match(/Solaris|SunOS|BSD/i)) {                                                               // 218
        // if user agent is a Solaris, SunOS, BSD Desktop                                                        // 219
        return 'desktop';                                                                                        // 220
      } else if (ua.match(/curl|Bot|B-O-T|Crawler|Spider|Spyder|Yahoo|ia_archiver|Covario-IDS|findlinks|DataparkSearch|larbin|Mediapartners-Google|NG-Search|Snappy|Teoma|Jeeves|Charlotte|NewsGator|TinEye|Cerberian|SearchSight|Zao|Scrubby|Qseero|PycURL|Pompos|oegp|SBIder|yoogliFetchAgent|yacy|webcollage|VYU2|voyager|updated|truwoGPS|StackRambler|Sqworm|silk|semanticdiscovery|ScoutJet|Nymesis|NetResearchServer|MVAClient|mogimogi|Mnogosearch|Arachmo|Accoona|holmes|htdig|ichiro|webis|LinkWalker|lwp-trivial/i) && !ua.match(/mobile|Playstation/i)) {
        // if user agent is a BOT/Crawler/Spider                                                                 // 222
        return options.botUserAgentDeviceType||'bot';                                                            // 223
      } else {                                                                                                   // 224
        // Otherwise assume it is a mobile Device                                                                // 225
        return options.unknownUserAgentDeviceType||'phone';                                                      // 226
      }                                                                                                          // 227
    })();                                                                                                        // 228
                                                                                                                 // 229
    this._deps.changed();                                                                                        // 230
  }                                                                                                              // 231
                                                                                                                 // 232
                                                                                                                 // 233
  Meteor.Device = new Device;                                                                                    // 234
  Meteor.Device.detectDevice();                                                                                  // 235
})();                                                                                                            // 236
                                                                                                                 // 237
                                                                                                                 // 238
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/mystor:device-detection/device_helpers.js                                                            //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
if (typeof UI !== 'undefined') {                                                                                 // 1
  /*                                                                                                             // 2
   * Template Rendering Shortcut                                                                                 // 3
   */                                                                                                            // 4
  UI.registerHelper('deviceRender', function() {                                                                 // 5
    var name = this;                                                                                             // 6
    if (! _.isString(name)) {                                                                                    // 7
      // If meteor-router is installed, no passed name will load Meteor.Router.page()                            // 8
      if (typeof Meteor.Router !== 'undefined') {                                                                // 9
        name = Meteor.Router.page();                                                                             // 10
      } else {                                                                                                   // 11
        name = '';                                                                                               // 12
      }                                                                                                          // 13
    }                                                                                                            // 14
                                                                                                                 // 15
    var device_type = Meteor.Device.type();                                                                      // 16
    var suffix = Meteor.Device.getSuffix(device_type);                                                           // 17
                                                                                                                 // 18
    var device_name = name + (suffix || '');                                                                     // 19
                                                                                                                 // 20
    if (Template[device_name]) {                                                                                 // 21
      // Try to load the suffixed template                                                                       // 22
      return Template[device_name];                                                                              // 23
    } else if (Template[name]) {                                                                                 // 24
      // Fallback to unsuffixed template if suffixed template doesn't exist                                      // 25
      return Template[name];                                                                                     // 26
    } else {                                                                                                     // 27
      // Blaze gets grumpy if you return undefined                                                               // 28
      return null;                                                                                               // 29
    }                                                                                                            // 30
  });                                                                                                            // 31
                                                                                                                 // 32
  /*                                                                                                             // 33
   * Device Type Helpers                                                                                         // 34
   */                                                                                                            // 35
  UI.registerHelper('isTV', function() {                                                                         // 36
    return Meteor.Device.isTV();                                                                                 // 37
  });                                                                                                            // 38
  UI.registerHelper('isTablet', function() {                                                                     // 39
    return Meteor.Device.isTablet();                                                                             // 40
  });                                                                                                            // 41
  UI.registerHelper('isPhone', function() {                                                                      // 42
    return Meteor.Device.isPhone();                                                                              // 43
  });                                                                                                            // 44
  UI.registerHelper('isDesktop', function() {                                                                    // 45
    return Meteor.Device.isDesktop();                                                                            // 46
  });                                                                                                            // 47
  UI.registerHelper('isBot', function() {                                                                        // 48
    return Meteor.Device.isBot();                                                                                // 49
  });                                                                                                            // 50
                                                                                                                 // 51
  UI.registerHelper('device_type', function() {                                                                  // 52
    return Meteor.Device.type();                                                                                 // 53
  });                                                                                                            // 54
}                                                                                                                // 55
                                                                                                                 // 56
                                                                                                                 // 57
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['mystor:device-detection'] = {};

})();
