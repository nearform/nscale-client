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

var fs = require('fs');
var path = require('path');
var HOME_DIR = process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];
var CONFIG_PATH =  path.resolve(HOME_DIR, '.nearform');
var GLOBAL_CONFIG = path.resolve(HOME_DIR, '.nscale/config/config.json');
var DEFAULT_PORT = 3223;



exports.writeBlankConfig = function() {
  var kernelPort = getKernelPort();
  var config = {use: 'localhost', targets: { localhost: {host: 'localhost', port: kernelPort}}};
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
  return config;
};



var loadConfig = function() {
  var config = null;

  if (!fs.existsSync(CONFIG_PATH)) {
    config = exports.writeBlankConfig();
  } else {
    config = fs.readFileSync(CONFIG_PATH, 'utf8');
    config = JSON.parse(config);
    config.targets[config.use].port = getKernelPort();
    saveConfig(config);
  }
  return config;
};



var saveConfig = function(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
};

var getKernelPort = function() {
  var config = null;
  if (fs.existsSync(GLOBAL_CONFIG)) {
    config = fs.readFileSync(GLOBAL_CONFIG);
    config = JSON.parse(config);
  }

  return config ? config.kernel.port : DEFAULT_PORT;
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
  } else {
    cfg.targets[host] = {host: host, port: port};
    cfg.use = host;
  }

  if (port && cfg.targets[host]) {
    cfg.targets[host].port = port;
  }

  saveConfig(cfg);
  return cfg;
};

