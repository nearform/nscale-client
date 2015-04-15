/*
 * command line interface for nfd
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

var CONFIG_PATH = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'] + '/.nearform';
var GLOBAL_CONFIG_PATH = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'] + '/.nscale/config/config.json';
var fs = require('fs');



exports.writeBlankConfig = function() {
  var kernelPort = getGlobalConfig().kernel.port || 3223;
  var config = {use: 'localhost', targets: { localhost: {host: 'localhost', port: kernelPort}}};
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
  return config;
};



var loadConfig = function() {
  var config = null;

  if (!fs.existsSync(CONFIG_PATH)) {
    config = exports.writeBlankConfig();
  }
  else {
    config = fs.readFileSync(CONFIG_PATH, 'utf8');
    config = JSON.parse(config);
  }
  return config;
};



var saveConfig = function(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
};

var getGlobalConfig = function() {
  var config = null;

  if (fs.existsSync(GLOBAL_CONFIG)) {
    config = fs.readFileSync(GLOBAL_CONFIG);
    config = JSON.parse(config);
  }
  return config;
}



exports.getConfig = function() {
  var cfg = loadConfig();
  return cfg.targets[cfg.use];
};



exports.setToken = function(token) {
  var cfg = loadConfig();
  cfg.targets[cfg.use].token = token;
  saveConfig(cfg);
  return cfg.targets[cfg.use];
};



exports.clearToken = function() {
  var cfg = loadConfig();
  cfg.targets[cfg.use].token = null;
  saveConfig(cfg);
  return cfg.targets[cfg.use];
};



exports.use  = function(host, port) {
  var cfg = loadConfig();
  if (cfg.targets[host]) {
    cfg.use = host;
  }
  else {
    cfg.targets[host] = {host: host, port: port};
    cfg.use = host;
  }
  saveConfig(cfg);
  return cfg;
};

