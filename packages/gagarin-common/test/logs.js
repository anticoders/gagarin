import {logs} from '../src/index';
import chai, {assert} from 'chai';
import * as sinon from 'sinon';
import chaiAsPromised from 'chai-as-promised';
import {join} from 'path';

chai.should();
chai.use(chaiAsPromised);

describe('Test Logging Utilities', () => {

  beforeEach(function () {
    this.message = 'This is some random message: ' + Math.random();
    this.spy = sinon.spy();
    logs.setLogger(options => {
      this.spy(options.data);
    });
  });

  afterEach(function () {
    logs.setLogger();
  });

  it('should log "test" message', function () {
    logs.test(this.message);
    assert(this.spy.calledWithMatch({ message: this.message }));
  });

  it('should log "server" message', function () {
    logs.server(this.message);
    assert(this.spy.calledWithMatch({ message: this.message }));
  });

  it('should log "client" message', function () {
    logs.client(this.message);
    assert(this.spy.calledWithMatch({ message: this.message }));
  });

  it('should log "system" message', function () {
    logs.system(this.message);
    assert(this.spy.calledWithMatch({ message: this.message }));
  });

});
