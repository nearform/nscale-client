/*
 * command line interface for nscale
 *
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

var fs = require('fs');
var path = require('path');
var EE = require('events').EventEmitter;
var inherits = require('util').inherits;

function Fetcher() {
  if (!(this instanceof Fetcher)) {
    return new Fetcher();
  }

  EE.call(this);

  var self = this;

  /**
   * Fetches a system id from the filesystem is one is not provided.
   * Exist the node process if the system is missing.
   */
  function fetchSys(expected, args) {
    var sys = null;

    if (args._.length >= expected) {
      return args;
    }

    sys = currentSys();

    if (!sys) {
      // TODO refactor to avoid to have a console.log here
      self.emit('error', new Error('unable to find a valid system.json in the current directory'));
    }

    args._.unshift(sys);

    return args;
  };

  this.fetchSys = fetchSys;
}

inherits(Fetcher, EE);


function currentSys() {
  var dir = process.cwd();
  var system = path.join(dir, 'system.json');
  try {
    return JSON.parse(fs.readFileSync(system)).name;
  } 
  catch(err) {
    return null;
  }
}


module.exports = Fetcher;

