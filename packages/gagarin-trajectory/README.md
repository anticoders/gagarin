# gagarin-trajectory

This package solves the problem of finding the right `node` exacutable to use with the meteor release corresponding to the current project setup.

The solution is robust and simple. The package installs a meteor build plugin that looks at `process.argv[0]` and saves the value to:
```
/project/root/.gagarin/local/trajectory.json
```
