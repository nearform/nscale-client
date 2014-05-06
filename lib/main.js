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
/*
 * supports the following operations
 *
 * list       - list all tables in this dynamo instance
 * describe   - describe the named table
 * query      - run a query on the specified table and return the results limited to 20 elements
 *              into the node repl
 * throughput - adjust the table throughput to the given value
 */

'use strict';

var readline = require('readline');
var opt = require('optimist');
var nfdsdk = require('../../nfd-sdk/main')();
var argv = opt.usage('Usage: nfd.js --host <hostname> --port <port> --cmd <command>').
               alias('h', 'host').
               alias('c', 'cmd').
               alias('p', 'port').argv;
var rl;



/**
 * print help
 */
var help = function() {
  console.log('');
  console.log('list systems                                        - list all systems in this nfd instance');
  console.log('list containers <systemid>                          - list all containers in this system');
  console.log('build <systemid> <containerid>                      - build a specific container');
  console.log('quit                                                - to quit');
  console.log('');
};



var listSystems = function(cb) {
  nfdsdk.listSystems(function(systems) {
    console.log(JSON.stringify(systems, null, 2));
    cb();
  });
};



var listContainers = function(id, cb) {
  nfdsdk.listContainers(id, function(containers) {
    console.log(JSON.stringify(containers, null, 2));
    cb();
  });
};



var buildContainer = function(systemId, containerId, cb) {
  nfdsdk.buildContainer(systemId, containerId, function(result) {
    if (result) {
      console.log(JSON.stringify(result, null, 2));
    }
    cb();
  });
};



var deployContainer = function(systemId, containerId, cb) {
  nfdsdk.deployContainer(systemId, containerId, function(result) {
    if (result) {
      console.log(JSON.stringify(result, null, 2));
    }
    cb();
  });
};



var runCommand = function(rl, input, callback) {
  var params;

  if (input.indexOf('list systems') > -1) {
    listSystems(function() {
      callback();
    });
  }
  else if (input.indexOf('list containers') > -1) {
    params = input.split(' ');
    listContainers(params[2], function() {
      callback();
    });
  }
  else if (input.indexOf('build') > -1) {
    params = input.split(' ');
    buildContainer(params[2], params[3], function() {
      callback();
    });
  }
  else if (input.indexOf('deploy') > -1) {
    params = input.split(' ');
    deployContainer(params[2], params[3], function() {
      callback();
    });
  }
  else if (input.indexOf('help') > -1) {
    help();
    callback();
  }
  else if (input.indexOf('quit') > -1) {
    if (rl) {
      console.log('close');
      nfdsdk.quit(function() {
        rl.close();
        process.exit(0);
      });
    }
  }
  else {
    callback();
  }
};



/**
 * main prompt
 */
var promptForInput = function() {
  rl.question('nfd> ', function(input) {
    runCommand(rl, input, promptForInput);
  });
};



var stdoutHandler = function(out) {
  console.log(out);
};



var stderrHandler = function(err) {
  console.log(err);
};


exports.main = function() {
  if (argv.host && argv.port) {
    nfdsdk.connect({hostname: argv.host, port: argv.port}, function() {
      nfdsdk.ioHandlers(stdoutHandler, stderrHandler);
      if (argv.cmd) {
        runCommand(null, argv.cmd, function() {});
      }
      else {
        rl = readline.createInterface({input: process.stdin, output: process.stdout});
        promptForInput();
      }
    });
  }
  else {
    opt.usage();
  }
};


exports.main();


