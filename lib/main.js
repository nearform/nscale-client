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

var _ = require('underscore');
var cliTable = require('cli-table');
var readline = require('readline');
var opt = require('optimist');
var nfdsdk = require('../../nfd-sdk/main')();
var argv = opt.usage('Usage: nfd.js --host <hostname> --port <port> --cmd <command>').
               alias('h', 'host').
               alias('c', 'cmd').
               alias('p', 'port').argv;
var rl;

process.stdin.setEncoding('utf8');



/**
 * print help
 */
var help = function() {
  console.log('');
  console.log('list systems                                        - list all systems in this nfd instance');
  console.log('get system <systemid>                               - get head system in this nfd instance');
  console.log('get deployed <systemid>                             - get deployed system in this nfd instance');
  console.log('list revisions <systemid>                           - list all revisions in this system');
  console.log('get revision <systemid> <revisionid>                - get revision in this system');
  console.log('create system <name> <namespace>                    - create system in this nfd instance');
  console.log('put system <user> < system.json                     - put system in this nfd instance');
  console.log('delete system <user> <systemid>                     - delete system from this nfd instance');
  console.log('list containers <systemid>                          - list all containers in this system');
  console.log('add container <user> <systemid> < container.json    - add container in this system');
  console.log('put container <user> <systemid> < container.json    - put container in this system');
  console.log('delete container <user> <systemid> <containerid>    - delete container from this system');
  console.log('build container <user> <systemid> <containerid>     - build a specific container');
  console.log('deploy system <user> <systemid> <revisionid>        - deploy a specific system revision');
  console.log('list timeline <systemid>                            - list timeline in this system');
  console.log('quit                                                - to quit');
  console.log('');
};



var listSystems = function(cb) {
  nfdsdk.listSystems(function(systems) {
    console.log(JSON.stringify(systems, null, 2));
    cb();
  });
};



var getSystem = function(id, cb) {
  nfdsdk.getSystem(id, function(system) {
    console.log(JSON.stringify(system, null, 2));
    cb();
  });
};



var getDeployed = function(id, cb) {
  nfdsdk.getDeployed(id, function(system) {
    console.log(JSON.stringify(system, null, 2));
    cb();
  });
};



var createSystem = function(name, namespace, cb) {
  nfdsdk.createSystem(name, namespace, function(system) {
    console.log(JSON.stringify(system, null, 2));
    cb();
  });
};



var deleteSystem = function(user, systemId, cb) {
  nfdsdk.deleteSystem(user, systemId, function(result) {
    console.log(JSON.stringify(result, null, 2));
    cb();
  });
};



var putSystem = function(user, cb) {
  var sys = '';
  process.stdin.on('readable', function() {
    sys += process.stdin.read();
  });

  process.stdin.on('end', function() {
    nfdsdk.putSystem(user, sys, function(system) {
      console.log(JSON.stringify(system, null, 2));
      cb();
    });
  });
};



var putContainer = function(user, systemId, cb) {
  var sys = '';
  process.stdin.on('readable', function() {
    sys += process.stdin.read();
  });

  process.stdin.on('end', function() {
    nfdsdk.putContainer(user, systemId, sys, function(result) {
      console.log(JSON.stringify(result, null, 2));
      cb();
    });
  });
};



var addContainer = function(user, systemId, cb) {
  var sys = '';
  process.stdin.on('readable', function() {
    sys += process.stdin.read();
  });

  process.stdin.on('end', function() {
    nfdsdk.addContainer(user, systemId, sys, function(result) {
      console.log(JSON.stringify(result, null, 2));
      cb();
    });
  });
};



var deleteContainer = function(user, systemId, containerId, cb) {
  nfdsdk.deleteContainer(user, systemId, containerId, function(result) {
    console.log(JSON.stringify(result, null, 2));
    cb();
  });
};



var listContainers = function(id, cb) {
  nfdsdk.listContainers(id, function(containers) {
    console.log(JSON.stringify(containers, null, 2));
    cb();
  });
};



var buildContainer = function(user, systemId, containerId, cb) {
  nfdsdk.buildContainer(user, systemId, containerId, function(result) {
    if (result) {
      console.log(JSON.stringify(result, null, 2));
    }
    cb();
  });
};



var listRevisions = function(systemId, cb) {
//  var table = new cliTable({head: ['Revision', 'deployed', 'description'], colWidths: [10, 10, 100]});
  var table = new cliTable({chars: { 'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': '',
                                     'bottom': '' , 'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': '',
                                     'left': '' , 'left-mid': '' , 'mid': '' , 'mid-mid': '',
                                     'right': '' , 'right-mid': '' , 'middle': ' ' },
                            style: { 'padding-left': 0, 'padding-right': 0 },
                            head: ['Revision', 'deployed', 'description'], colWidths: [50, 10, 100]});
  nfdsdk.listRevisions(systemId, function(revisions) {
    _.each(revisions, function(revision) {
      //table.push([revision.revision, revision.deployed, revision.description]);
      table.push([revision.guid, revision.deployed, revision.description]);
    });
    console.log(table.toString());
    cb();
  });
};



var getRevision = function(systemId, revisionId, cb) {
  nfdsdk.getRevision(systemId, revisionId, function(revisions) {
    console.log(JSON.stringify(revisions, null, 2));
    cb();
  });
};



var addToTimeline = function(cb) {
  var entry = '';
  process.stdin.on('readable', function() {
    entry += process.stdin.read();
  });

  process.stdin.on('end', function() {
    nfdsdk.addToTimeline(entry, function(result) {
      console.log(JSON.stringify(result, null, 2));
      cb();
    });
  });
};



var timeline = function(systemId, containerId, user, cb) {
  nfdsdk.timeline(systemId, containerId, user, function(result) {
    console.log(JSON.stringify(result, null, 2));
    cb();
  });
};



var deploySystem = function(user, systemId, revisionId, cb) {
  nfdsdk.deploySystem(user, systemId, revisionId, function(result) {
    if (result) {
      console.log(JSON.stringify(result, null, 2));
    }
    cb();
  });
};



var deployAll = function(systemId, revisionId, cb) {
  nfdsdk.deployAll(systemId, revisionId, function(result) {
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
  else if (input.indexOf('get system') > -1) {
    params = input.split(' ');
    getSystem(params[2], function() {
      callback();
    });
  }
  else if (input.indexOf('get deployed') > -1) {
    params = input.split(' ');
    getDeployed(params[2], function() {
      callback();
    });
  }
  else if (input.indexOf('put system') > -1) {
    params = input.split(' ');
    putSystem(params[2], function() {
      callback();
    });
  }
  else if (input.indexOf('create system') > -1) {
    params = input.split(' ');
    createSystem(params[2], params[3], function() {
      callback();
    });
  }
  else if (input.indexOf('delete system') > -1) {
    params = input.split(' ');
    deleteSystem(params[2], params[3], function() {
      callback();
    });
  }
  else if (input.indexOf('list containers') > -1) {
    params = input.split(' ');
    listContainers(params[2], function() {
      callback();
    });
  }
  else if (input.indexOf('add container') > -1) {
    params = input.split(' ');
    addContainer(params[2], params[3], function() {
      callback();
    });
  }
  else if (input.indexOf('put container') > -1) {
    params = input.split(' ');
    putContainer(params[2], params[3], function() {
      callback();
    });
  }
  else if (input.indexOf('delete container') > -1) {
    params = input.split(' ');
    deleteContainer(params[2], params[3], params[4], function() {
      callback();
    });
  }
  else if (input.indexOf('list revisions') > -1) {
    params = input.split(' ');
    listRevisions(params[2], function() {
      callback();
    });
  }
  else if (input.indexOf('get revision') > -1) {
    params = input.split(' ');
    listRevisions(params[2], params[3], function() {
      callback();
    });
  }
  else if (input.indexOf('add timeline') > -1) {
    addToTimeline(function() {
      callback();
    });
  }
  else if (input.indexOf('list timeline') > -1) {
    params = input.split(' ');
    var systemId = (params.length > 2) ? params[2] : null;
    var containerId = (params.length > 3) ? params[3] : null;
    var user = (params.length > 4) ? params[4] : null;

    timeline(systemId, containerId, user, function() {
      callback();
    });
  }
  else if (input.indexOf('build container') > -1) {
    params = input.split(' ');
    buildContainer(params[2], params[3], params[4], function() {
      callback();
    });
  }
  else if (input.indexOf('deploy system') > -1) {
    params = input.split(' ');
    deploySystem(params[2], params[3], params[4], function() {
      callback();
    });
  }
  else if (input.indexOf('deploy all') > -1) {
    params = input.split(' ');
    deployAll(params[2], params[3], function() {
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
    console.log(input);
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
  if (!argv.host) {
    argv.host = 'localhost';
  }
  if (!argv.port) {
    argv.port = 3223;
  }
  if (argv.host && argv.port) {
    nfdsdk.connect({hostname: argv.host, port: argv.port}, function() {
      nfdsdk.ioHandlers(stdoutHandler, stderrHandler);
      if (argv.cmd) {
        runCommand(null, argv.cmd, function() {
          nfdsdk.quit(function() {
            process.exit(0);
          });
        });
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

