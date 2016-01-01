## gagarin-cli

```
commands:

gagarin setup
gagarin run [pattern]
gagarin cleanup
gagarin status
gagarin logs <name>

options:

-f, --framework <type>
-v, --verbose
-r, --force-rebuild
-C, --no-cleanup
-c, --config <path>
-d, --directory
-o, --options grep="UI"&reporter='dots'

```

### gagarin init

Creates gagarin configuration file in the current directory:
```javascript
// gagarin.json
{
  options     : {
    cleanup   : true
  },
  frameworks  : [
    {
      type    : 'mocha',
      pattern : 'tests/mocha/**/*.js',
      utilize : [ 'chromedriver', 'client1', 'client2' ],
      options : {
        ui       : 'gagarin',
        reporter : 'spec'
      }
    },
    {
      type    : 'cucumber',
      pattern : 'tests/cucumber/**/*.feature',
      options : {}
    },
    {
      type    : 'mocha-unit',
      pattern : '**/*.test.js',
      options : {}
    }
  ],
  equipment : [
    {
      name    : 'chromedriver',
      type    : 'custom',
      options : {
        pwd    : '~',
        script : './chromedriver',
      }
    },
    {
      name    : 'client1',
      type    : 'browser',
      options : {
        kind   : 'chrome',
        port   : 9515,
      }
    },
    {
      name    : 'client2',
      type    : 'browser',
      options : {
        kind   : 'chrome',
        port   : 9515,
      }
    },
    {
      name    : 'client3',
      type    : 'browser',
      options : {
        kind   : 'firefox',
        port   : 4444,
      }
    },
    {
      name   : 'db',
      type   : 'mongo',
      options : {
        db     : 'gagarin',
        port   : 27017,
        oplog  : true,
      }
    },
    {
      name    : 'app1',
      type    : 'meteor',
      options : {
        path   : '..',
        port   : 1961,
        mongo  : {
          port : 27017,
          db   : 'gagarin'
        },
      }
    },
    {
      name    : 'app2',
      type    : 'meteor',
      options : {
        path   : '..',
        port   : 1962,
        mongo  : {
          port : 27017,
          db   : 'gagarin'
        },
      }
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
describe('My Test Suite', function () {
  var server = meteor();

});
```
