![gagarin](https://s3.amazonaws.com/gagarinjs/assets/gagarinLogo.svg)

# Important note

Since version `0.4.0` the `server` object created by `meteor()` helper no longer has the `location` property. To make sure the `browser` starts on the proper location, you need to pass `server` as the first argument, so
```javascript
var server = meteor();
var client = browser(server); // before 0.4.0 you would use server.location here
```

# gagarin [![Circle CI](https://circleci.com/gh/anticoders/gagarin/tree/devel.svg?style=svg)](https://circleci.com/gh/anticoders/gagarin/tree/devel)

Gagarin is a tool you can use in your tests to run Meteor apps in a sandboxed environment. It's useful when you need more refined control over the meteor processes and test fancy things, e.g. the behavior of your app on server restarts or when you have multiple app instances writing to the same database. This is currently not achievable with the official Meteor testing framework.

For more information on the official testing framework for Meteor, see [Velocity](http://velocity.meteor.com/).

## How is it different from Velocity?

Gagarin is practically external to meteor. It only takes care of spawning your meteor processes and allows you to execute source code chunks in your app environment from within your test suite and that's it. On the other hand, Velocity will deeply integrate with your app by making your test cases an integral part of your app source code, but only in a special type of builds called mirrors. This is very clever because your tests will run as fast as it can possibly be. The only drawback of using velocity is that you don't have a satisfactory control over your meteor processes. In most situations this is acceptable but there are some very specific scenarios when this is not sufficient. In those cases Gagarin is probably a good choice. Gagarin tests will run a little bit slower because the source code is send to your app through DDP, but in most situations in which you would need Gagarin this is acceptable because the bottleneck of your test speed is usually somewhere else. Another advantage of using DDP is that the tests can be potentially executed on a deployed application which may be useful in some specific cases, though this feature is not fully implemented yet.

## How is it different from Laika?

In needs to be said that Gagarin originates from Laika. In some sense, one may think of it as Laika 2.0, though it's not backward compatible. The main advantages of using Gagarin rather then Laika are the following:
- it does not depend on `phantomjs`
- it does not depend on injected source code, so the test runner does not have to rebuild your app each time you run the tests
- the communication with client is done through a real webDriver API, which means that your tests can visit any web page and are not bound to your app's routes
- it does not depend on external mongo processes; the tests runner is clever enough to find mongo executable within your meteor development bundle

# The test runner

Gagarin can be also used as a simple test runner, which in it's essence is very similar to [laika](https://github.com/arunoda/laika), though it's much more flexible and up-to-date and compatible with the latest Meteor versions. Currently it's implemented as a custom `mocha` interface, which simply extends the standard `bdd` ui. This may change in the future if there's a a demand to support other testing frameworks.

## Installation

First you need to add `anti:gagarin` package to your app:

    meteor add anti:gagarin

It basically adds some backdoor functionality for testing purposes. But don't worry - it's only activate when `GAGARIN_SETTINGS` environment variable is present. For safety, double check it's not there in your production environment.

If you want to use the test runner, install the cli tool as well:

    npm install -g gagarin

If your app depends on the old unmigrated atmosphere packages than you also need to make sure that `meteorite` is installed globally.

## The simplest possible test

Basically, you run the tests with `gagarin` command within you project root.
By default, the script will look for your test definitions inside `tests/gagarin` directory. You can alter this behavior by providing a custom path as the first parameter. For details try `gagarin --help`.

The simplest possible test suite may look like this:
```javascript
describe('Example test suite', function () {
  var server = meteor();

  it('execute should work', function () {
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
In the above example `meteor` is a global function provided by the framework, which you can use to spawn new meteor instances. Another function of this type is `browser`. For your convenience we've also exposed `expect` from the good old [chai](http://chaijs.com/).

## Testing with browser

Gagarin makes it really easy to coordinate tests for client and server. This idea originated from Laika, but we decided to go for more promise-oriented API. Basically speaking, you can use the `browser` function to spawn as many clients as you want. The only requirement is that you have a webdriver running somewhere. By default, gagarin will try to find webdriver at port `9515` (chromedriver default). You can customize the webdriver url by providing the corresponding option for the cli tool:
```
gagarin --webdriver http://localhost:9515
```
If you're testing locally, we recommend using **chromedriver** which can be downloaded [from here](http://chromedriver.storage.googleapis.com/index.html). After unpacking the executable the only thing you need to do is to run it in the background. By default the process will listen on port `9515` by default. This can be altered by specifying the port explicitly
```
./chromedriver --port=4444
```
Other webdrivers can be used as well. However, if you plan to use [phantomjs](http://phantomjs.org/) and **GhostDriver** please note that due to [a BUG in GhostDriver](https://github.com/detro/ghostdriver/issues/90) all browser sessions will share the same cookie jar, which may be problematic in test scenarios when multiple concurrent users need to be created.

A test suite using both server and client may look like this:
```javascript
describe('You can also use browser in your tests', function () {
  var server = meteor();
  var client = browser(server);

  it('should just work', function () {
    return client.execute(function () {
      // some code to execute
    }).then(function () {
      return server.execute(function () {
        // some code to execute on server
      });
    });
  });
});
```

## Testing with Selenium WebDriver

Lets assume that you have a copy of `selenium-server-standalone-*.jar` available at `/path/to/selenium.jar`. First start a selenium "hub" with the following command:
```
java -jar /path/to/selenium.jar -role hub
```
Selenium server should be listening on port `4444` by default. Then start a selenium "node" with
```
java -jar /path/to/selenium.jar -role node -hub http://localhost:4444
```
Finally run your Gagarin tests providing `--webdriver` option
```
gagarin --webdriver http://localhost:4444/wd/hub
```
We've been testing Gagarin with `chrome` (38) and `firefox` (34). At this moment we cannot guarantee it will work with other browsers.

# Examples

Since we don't have a comprehensive documentation yet, please consider the following set of simple examples as a current API reference. Note that this document will evolve in the nearest future.

## Scope of the a local variable

It's good to keep in mind that the code which is intended to be executed on either server or client is passed as a string. Of course it does not have an immediate access to you local variable scope. In particular, things like:
```javascript
var a = 1;
it("should be able to access local variable", function () {
  return client.execute(function () {
    return a + 1;
  });
});
```
will throw "a is undefined". Trying to set `a = 1;` will throw as well because the code is implicitly executed in `strict mode`, which does not allow introducing new variables to the global scope.

## Passing arguments to client and server code

If you don't need to modify the variables within your "remote" code then probably the easiest way to overcome the problem described above is to pass local scope variables as arguments:

```javascript
var a = 1;
it("should be able to access local variable", function () {
  return client.execute(function (a) {
    return a + 1;
  }, [ a ]); // array of arguments
});
```
Note that this construction will already allow you to do anything you want with your local variables, because you can always update them within `then`, after your client/server computation is done. However, it's not very convenient in more complicated scenarios.

## Copying closure

To simplify the interaction between client and server code, we've added an affordance to reuse the declared closure in all three environments: test scope, server and client. To this end, you need to explicitly provide a list of variables to be synced as well as an accessor function:

```javascript
var a = 1, b = 2, c = 0;
// this is a hack :)
closure(['a', 'b', 'c'], function (key, value) {
  return eval(key + (arguments.length > 1 ? '=' + JSON.stringify(value) : ''));
});
```
Now this code should work without problems:
```javascript
it("should be able to access local variables", function () {
  return client.execute(function (a) {
    c = a + b;
  }).then(function () {
    expect(c).to.equal(3);
  });
});
```
The only reserved variable name for closures is `$`, which you probably would not like to use for other reasons.

## Asynchronous test cases

On both server and client you can also use asynchronous scripts:
```javascript
it("should be able to do work asynchronously", function () {
  return server.promise(function (resolve) {
    setTimeout(function () {
     resolve(1234);
    }, 1000);
  }).then(function (value) {
    expect(value).to.equal(1234);
  });
});
```
The second argument to the `promise` is `reject`, so if you want to throw asynchronously:
```javascript
it("should be able throw asynchronously", function () {
  return server.promise(function (resolve, reject) {
    setTimeout(function () {
     reject(new Error("this is some fake error"));
    }, 1000);
  }).expectError(function (err) {
    expect(err.message).to.contain("fake error");
  });
});
```
If you want to pass additional variables to `promise` method, do it like this:
```javascript
it("should be able to pass arguments", function () {
  return server.promise(function (resolve, reject, arg1, arg2) {
    setTimeout(function () {
     resolve(arg1 + arg2);
    }, 1000);
  }, [ 1, 2 ]).then(function (value) {
    expect(value).to.equal(3);
  });
});
```

## Waiting for conditions

There's also a useful helper to wait for conditions. Again, it works on both server and client:
```javascript
before(function () {
  return client.execute(function () {
    Items.insert({_id: 'someFakeId'});
  });
});

it("should be able to wait on server", function () {
  return server.wait(1000, 'until data is propagated to the server', function () {
    return Items.findOne({_id: 'someFakeId'});
  }).then(function (value) {
    expect(value).to.be.ok;
    expect(value._id).to.equal('someFakeId');
  });
});
```

# For contributors

To test the package locally make sure that a webdriver is listening on port `9515`, then simply run the tests with the following command
```
npm test
```
or just
```
./test.js [options]
```
in the project root directory. Additionally you can use
```
./test.js --help
```
to display information about all possible options. For example, to use a different webdriver location, you can specify it with
```
./test.js --webdriver http://localhost:4444
```

## Disclaimer

Gagarin is still in a pretty early development stage. Though it's API will probably change. I have based most of the design decisions on experience with Meteor apps testing but I understand that there are always people who are more experienced and have some nice ideas. I am always opened for discussion and please, feel welcome if you want to contribute.


