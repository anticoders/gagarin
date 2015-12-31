## gagarin-cli

```
gagarin init
gagarin launch --rebuild
gagarin land
gagarin status
gagarin restart <name>
gagarin shell <name>
gagarin logs <name>
```

### gagarin init

Creates gagarin configuration file in the current directory:
```javascript
// gagarin.json
{
  processes: {
    app: {
      type: 'meteor',
      path: '..'
    },
    db: {
      type: 'mongod',
      name: 'gagarin',
      port: 27017
    },
    wd: {
      
    }
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
