MyPackage = { where: 'client' };

var thisIsSomePrivateVariable = 0;

MyPackage.doSomething = function (value) {
  thisIsSomePrivateVariable += value;
  return thisIsSomePrivateVariable;
}
