# gagarin [![Circle CI](https://circleci.com/gh/anticoders/gagarin/tree/devel.svg?style=svg)](https://circleci.com/gh/anticoders/gagarin/tree/devel)

Gagarin is a tool you can use in your tests to run Meteor apps in a sandboxed environment. It's useful when you need more refined control over the meteor processes and test fancy things, e.g. the behavior of your app on server restarts or when you have multiple app instances writing to the same database. This is currently not achievable with the official Meteor testing framework.

For more information on the official testing framework for Meteor, see [Velocity](http://velocity.meteor.com/).

## How is it different from Velocity?

Gagarin is totally external to meteor. It only takes care of spawning your meteor processes and allows you to execute source code chunks in your app environment from within your test suite. That's it. On the other hand, Velocity will deeply integrate with your app by making your test cases an integral part of your app source code, but only in a special type of builds called mirrors. This is very clever because your tests will run as fast as it can be. The only drawback of using velocity is that you don't have a great control over your meteor processes. In most situations this is acceptable but there are some very specific scenarios when this is not sufficient. In those cases Gagarin is probably a good choice. Gagarin tests will run a little bit slower because the source code is send to your app through a socket, but in most situations in which you would need Gagarin this is acceptable because the bottleneck of your test speed is usually somewhere else.

## How is it different from Laika?

In needs to be said that Gagarin originates from Laika. You can think of it as Laika 2.0. The main advantages of using Gagarin rather then Laika are the following:
- it does not depend on `phantomjs`
- it does not depend on injected code, so the test runner does not have to rebuild your app each time you run the tests
- the communication with client is done through a real webdriver API, which means that your tests can visit any web page and are not bound to your app routes
- it does not depend on external mongo processes; the tests runner is clever enough to find mongo executable within your meteor development bundle

## Test runner

Gagarin can be also used as a simple test runner, which in it's essence is very similar to [laika](https://github.com/arunoda/laika), though it's much more flexible and up-to-date and compatible with the latest Meteor versions. 

## Installation

First you need to add `gagarin` package to your app:

    meteor add anti:gagarin

It basically adds some backdoor functionality for testing purposes. But don't worry, it's not active when you're running your app from bundle, so in production environment there's no security risk. 

If you just want to use the test runner, install the cli tool as well:

    npm install -g gagarin

If your app depends on the old atmosphere packages than you also need to make sure that `meteorite` is installed globally.

## Example usage

Basically, you run the tests with `gagarin` command within you project root.
By default, the script will look for your test definitions inside `tests/gagarin` directory. You can alter this behavior by providing a custom path as the first parameter. For details try `gagarin --help`.

The simplest possible test suite may look like this:
```javascript
var expect = require('chai').expect;

describe('Example test suite', function () {
  var server = meteor();

  it('eval should work', function () {
    // return a promise
    return server.execute(function () {
      return Meteor.release;
    })
    .then(function (value) {
      expect(value).not.to.be.empty;
    });
  });

});
```
In the above example `meteor` is a global function provided by the framework, which you can use
to spawn new meteor innstances. Another function of this type is `browser`.

## Testing with browser

Gagarin makes it really easy to coordinate tests for client and server. This idea originated
from laika, but we decided to go for more promise-oriented API. Basically speaking, you can
use the `browser` function to spawn as many clients as you want. The only requirement is that
you have a webdriver running somewhere. You can customize the webdriver url
by providing the corresponding option for the cli tool:
```
gagarin --webdriver http://localhost:9515
```

A test suite using both server and client may look like this:
```javascript
describe('You can also use browser in your tests', function () {
  var server = meteor();
  var client = browser(server.location + "/path/to/some/view")

  it('should just work', function () {
    return client.execute(function () {
      // some code to execute
    }, [ /* list of args */ ]).then(function () {
      return server.execute(function () {
        // some code to execute on server
      });
    });
  });
});
```

## Disclaimer

Gagarin is still in a pretty early development stage. Though it's API will probably change. I have based most of the design decisions on experience with Meteor apps testing but I understand that there are always people who are more experienced and have some nice ideas. I am always opened for discussion and please, feel welcome if you want to contribute.


