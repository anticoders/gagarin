# gagarin [![Circle CI](https://circleci.com/gh/anticoders/gagarin/tree/devel.svg?style=svg)](https://circleci.com/gh/anticoders/gagarin/tree/devel)

Gagarin is a tool you can use in your tests to run Meteor apps in a sandboxed environment.

For more information on the official testing framework for Meteor, see [Velocity](http://velocity.meteor.com/).

## Instalation

First you need to

    meteor add anti:gagarin

and in your test directory

    npm install --save gagarin


## Example usage

Then you can do something more or less like this

```javascript
var Gagarin = require('gagarin');
var expect = require('chai').expect;
var path = require('path');

describe('Benchmark test suite', function () {

  var gagarin = new Gagarin({
    pathToApp: path.resolve('..')
  });

  before(function () {
    return gagarin;
  });

  after(function () {
    return gagarin.kill();
  });

  it('eval should work', function () {
    return gagarin.eval(function () {
      return Meteor.release;
    })
    .then(function (value) {
      expect(value).not.to.be.empty;
    });
  });

});
```
