## gagarin-cli

```
commands:

gagarin setup
gagarin run
gagarin cleanup
gagarin status
gagarin logs <name>

options:

--verbose
--no-build
--no-cleanup
--directory
--options

```

### gagarin init

Creates gagarin configuration file in the current directory:
```javascript
// gagarin.json
{
  cleanup   : true,
  browsers  : [
    {
      name: 'client1',
      type: 'chrome',
      port: 9515,
    },
    {
      name: 'client2',
      type: 'chrome',
      port: 9515,
    },
    {
      name: 'client3',
      type: 'firefox',
      port: 4444,
    },
  ],
  processes : [
    {
      name   : 'chromedriver',
      type   : 'custom',
      pwd    : '~',
      script : './chromedriver',
    },
    {
      name   : 'unit_tests',
      once   : true,
      type   : 'meteor',
      path   : '..',
      port   : 1961,
    },
    {
      name   : 'app1',
      type   : 'meteor',
      path   : '..',
      port   : 1961,
    },
    {
      name   : 'app2',
      type   : 'meteor',
      path   : '..',
      port   : 1962,
    },
    {
      name   : 'db',
      type   : 'mongod',
      db     : 'gagarin',
      port   : 27017,
      oplog  : true,
    },
    {
      once   : true,
      name   : 'mocha',
      type   : 'custom',
      script : 'mocha --require gagarin-mocha --ui gagarin .',
    },
  }
}
```

## gagarin-mocha-ui

To run your mocha tests use the following command:
```
mocha --require gagarin-mocha --ui gagarin gagarin/**/*.{js,coffee}
```

In your mocha test
```javascript
gagarin({
  
});

describe('My Test Suite', function () {
  var server = meteor();

});
```
