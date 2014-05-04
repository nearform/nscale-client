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
/*
 * nfd command line client
 *
 * use:
 * nfd <command> <target> 
 *
 * supported use cases
 *
 * nfd list systems                 list all systems managed by this instance
 *
 * nfd list containers <systemid>   list all conainers avilable under this system
 *
 */

'use strict';

var opts = require('yargs').argv;
var assert = require('assert');
var nfdsdk = require('../nfd-sdk/main');



var validateArgs = function(type, id) {
  var result = type === 'systems' || type === 'containers';
  if (type === 'containers') {
    result = undefined !== id;
  }
  assert(result);
};



var list = function(type, id) {
  validateArgs(type, id);

  switch(type) {
    case 'systems':
      nfdsdk.listSystems(function(systems) {
        console.log(JSON.stringify(systems, null, 2));
      });
      break;
    case '':
      nfdsdk.listContainers(id, function(containers) {
        console.log(JSON.stringify(containers, null, 2));
      });
      break;
    default:
      assert(false);
      break;
  }
};



var build = function() {
};



var exec = {list: list, build: build};
exec[opts._[1]](opts._);

