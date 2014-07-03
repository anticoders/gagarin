# gagarin

Gagarin is a tool which you can use in your tests to run Meteor app in a sandboxed environment.

## Instalation

First you need to
```
mrt install gagarin
```
and in your test directory
```
npm install --save gagarin
```

## Example usage

Then you can do something more or less like this

```javascript
var Gagarin = require('gagarin');
var expect = require('chai').expect;
var path = require('path');

describe('Benchmark test suite', function () {

  var gagarin = new Gagarin({
    pathToApp: path.resolve('../.meteor/local/build/main.js')
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
