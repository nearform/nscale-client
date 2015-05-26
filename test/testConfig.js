/*
 * THIS SOFTWARE IS PROVIDED ``AS IS'' AND ANY EXPRESSED OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED.  IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
 * STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING
 * IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

var expect = require('chai').expect;
var resolve = require('path').resolve;
var configModulePath = '../lib/config';

function cfg() {
  return require(configModulePath);
}

var HOME_DIR;
function resetHomeDir() {
  process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'] = HOME_DIR;
}

function setHomeDir(dir) {
  HOME_DIR = process.env.USERPROFILE || process.env.HOME;
  process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'] = HOME_DIR;

  process.env.HOME = resolve(__dirname, dir);
}

function itShouldThrowADescriptiveError() {
  it('should throw a descriptive error', function() {
    expect(function() {
      cfg().getConfig();
    }).to.throw(/No nscale-client config file found\./);
  });
}

describe('config test', function() {
  afterEach(function() {
    delete require.cache[require.resolve(configModulePath)];
    resetHomeDir();
  });

  describe('when ~/.nearform does not exist', function() {
    beforeEach(setHomeDir.bind(null, './helpers'));

    itShouldThrowADescriptiveError();
  });

  describe('when ~/.nearform does exist', function() {
    describe('when ~/.nscale/config/config.json does not exist', function() {
      beforeEach(setHomeDir.bind(null, './helpers/nearform-only-config'));
      itShouldThrowADescriptiveError();
    });

    describe('when ~/.nscale/config/config.json does exist', function() {
      beforeEach(setHomeDir.bind(null,
          './helpers/nearform-and-nscale-client-config'));

      it('should create a blank config', function(done) {
        cfg().getConfig().should.be.an.object;
        done();
      });

      describe('when a port is given to use', function() {
        it('should use the given port', function(done) {
          var expectedHost = 'wibble';
          var expectedPort = 3223;
          cfg().use(expectedHost, expectedPort);
          var config = cfg().getConfig();
          config.host.should.equal(expectedHost);
          config.port.should.equal(expectedPort);
          done();
        });
      });
    });
  });
});

