'use strict';

var expect = require('must-dist');

var CoolBeans = require('../lib/CoolBeans');

describe('module resolution without param', function () {
  it('works', function () {
    var beans = new CoolBeans({simple: {module: '../tests/modules/simple'}});
    var result = beans.get('simple');
    expect(result).to.be('Hallo');
  });

  it('returns the function when a param is expected', function () {
    var beans = new CoolBeans({someargs: {module: '../tests/modules/someargs'}});
    var result = beans.get('someargs')('Hallo').arg;
    expect(result).to.be('Hallo');
  });
});

describe('module resolution with array format', function () {
  it('with one string param', function () {
    var beans = new CoolBeans({
      someargs: {
        module: '../tests/modules/someargs',
        constructorArgs: ['the very arg in an array']
      }
    });
    var result = beans.get('someargs').arg;
    expect(result).to.be('the very arg in an array');
  });

  it('with three string params', function () {
    var beans = new CoolBeans({
      someargs: {
        module: '../tests/modules/someargs',
        constructorArgs: ['the very arg in an array', 'no2', 'no3']
      }
    });
    var result = beans.get('someargs');
    expect(result.arg).to.be('the very arg in an array');
    expect(result.arg2).to.be('no2');
    expect(result.arg3).to.be('no3');
  });

  it('with a complex object substructures have to be wrapped with "value"', function () {
    var beans = new CoolBeans({
      someargs: {
        module: '../tests/modules/someargs',
        constructorArgs: ['dummy', {value: {x: 'the very arg in an array'}}]
      }
    });
    var result = beans.get('someargs');
    expect(result.arg2.x).to.be('the very arg in an array');
  });

  it('with nested arrays works', function () {
    var beans = new CoolBeans({
      someargs: {
        module: '../tests/modules/someargs',
        constructorArgs: ['dummy', {value: ['the very arg in an array', 'another']}]
      }
    });
    var result = beans.get('someargs');
    expect(result.arg2).to.eql(['the very arg in an array', 'another']);
  });
});

describe('module resolution with object format', function () {
  it('with one string param and matching name works', function () {
    var beans = new CoolBeans({
      someargs: {
        module: '../tests/modules/someargs',
        constructorArgs: {theArg: 'the very arg in an object'}
      }
    });
    var result = beans.get('someargs').arg;
    expect(result).to.be('the very arg in an object');
    expect(result.arg2).to.be.undefined();
  });

  it('with different string param works', function () {
    var beans = new CoolBeans({
      someargs: {
        module: '../tests/modules/someargs',
        constructorArgs: {arg2: 'the very arg in an object'}
      }
    });
    var result = beans.get('someargs');
    expect(result.arg).to.be.undefined();
    expect(result.arg2).to.be('the very arg in an object');
  });

  it('with a complex object substructures have to be wrapped with "value"', function () {
    var beans = new CoolBeans({
      someargs: {
        module: '../tests/modules/someargs',
        constructorArgs: {theArg: {value: {x: 'the very arg in an object'}}}
      }
    });
    var result = beans.get('someargs');
    expect(result.arg.x).to.be('the very arg in an object');
  });
});

