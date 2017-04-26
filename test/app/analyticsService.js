const should = require('should');
const deviceDetector = require('../../app/lib/cc-device-detector');

describe('Device Detector', () => {
  it('Should correctly identify a New Relic Pinger', done => {
    let client = deviceDetector.parse('NewRelicPinger/1.0 (1354316)');
    client.type.should.equal('Bot');
    client.browser.should.equal('');
    client.engine.should.equal('NewRelicPinger');
    client.os.should.equal('');
    done();
  });

  it('Should correctly identify Mac Chrome', done => {
    let client = deviceDetector.parse('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36');
    client.type.should.equal('Desktop');
    client.browser.should.equal('Chrome');
    client.engine.should.equal('Webkit');
    client.version.should.equal('57.0.2987.133');
    client.os.should.equal('Mac');
    done();
  });
});

