import * as files from '../src/index';
import {checkPathExists} from '../src/check';
import {asPromise} from '../src/utils';
import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {readFile} from 'fs';
import {join} from 'path';
import rimraf from 'rimraf';

chai.should();
chai.use(chaiAsPromised);

let pathToApp  = join(__dirname, 'app');
let pathToApp2 = join(__dirname, 'app2');

describe('Test File Utilities', () => {

  var pathToGitIgnore  = join(pathToApp,  '.gagarin', '.gitignore');
  var pathToGitIgnore2 = join(pathToApp2, '.gagarin', '.gitignore');

  describe('Given .gagarin/.gitignore already exists', () => {
    before(function () {
      return files.ensureGagarinGitIgnore(pathToApp);
    });
    it('should not change its content', () => {
      return asPromise(readFile)(pathToGitIgnore, { encoding: 'utf8' })
        .should.eventually.equal('/local/*\n!/local/gagarin.pathToNode\n');
    });
  });

  describe('Given .gagarin folder does not exist', () => {
    before(function () {
      return files.ensureGagarinGitIgnore(pathToApp2);
    });
    after(function (done) {
      rimraf(pathToApp2, done);
    });
    it('should create all folders in-between', () => {
      return checkPathExists(pathToGitIgnore2);
    });
  });

});
