#!/usr/bin/env node
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

var exec = require('child_process').exec,
		fs 	 = require('fs');

var nscaleRoot = getUserHome() + '/.nscale';

function getUserHome() {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

function start() {
	var logDir = nscaleRoot + '/log';
	var serverProcess = exec('nsd-server -c ' + config + ' > ' + logDir + '/server.log 2>&1 &');
	var apiProcess = exec('nsd-api -c ' + config + ' > ' + logDir + '/api.log 2>&1 &');
	var webProcess = exec('nsd-web -c ' + config + ' > ' + logDir + '/web.log 2>&1 &');
	console.log(command + " started");
}

var args = process.argv.slice(2);
var command = args[0];

if (command === 'server') {

	var action = args[1];
	if (action === 'start') {
		console.log(command + " starting..");

		var config = args[2] || nscaleRoot + '/config/config.json';

		// if config is default config then check if it exists, if not then run nsd-init before starting
		if (config === nscaleRoot + '/config/config.json' && (!fs.existsSync(config)) ) {
			var initProcess = exec('nsd-init');
			initProcess.on('exit', function () {
    		start();
			});
		} else {
			start();
		}

	} else if (action === 'stop') {

		console.log(command + " stopping..");

		exec("kill $(ps aux | grep [n]sd-web | awk '{print $2}')");
		exec("kill $(ps aux | grep [n]sd-api | awk '{print $2}')");
		exec("kill $(ps aux | grep [n]scale-server | awk '{print $2}')");

		console.log(command + " stopped");

	} else if (action === 'logs') {

		var logDir = nscaleRoot + '/log';
		var logfile = args[2] || 'server.log';
		var logProcess = exec('tail -f -20 ' + logDir + '/' + logfile);
		logProcess.stdout.pipe(process.stdout)

	} else {
		console.log("'" + command + " " + action + "' command not supported.");
	}

} else {
	require('../lib/main')(process.argv.slice(2));
}

