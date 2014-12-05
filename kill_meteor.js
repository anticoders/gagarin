#!/usr/bin/env node

// in fact you shouldn't need this tool; it was only useful during the development to kill zombie phantom processes

var exec = require('child_process').exec;
var PIDs = [];

var child = exec('ps -A | grep meteor', function (error, stdout, stderr) {
  var lines = stdout.split("\n");
  lines.forEach(function (line) {
    var match = /^\s*(\d+)\s/.exec(line);
    if (match) {
      PIDs.push(match[1]);
    }
  });

  if (PIDs.length > 0) {
    exec('kill ' + PIDs.join(' '), function (error) {
      if (error) {
        console.log(error);
      } else {
        console.log('killed ' + PIDs.join(', '));
      }
    });
  }

});