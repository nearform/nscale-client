#!/usr/bin/env node
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

var program = require('commist')();
var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var cliTable = require('cli-table');
var sdk = require('nscale-sdk/main')();
var prompt = require('prompt');
var cfg = require('./config');
var fetchSys = require('./fetchSys');
var exec = require('child_process').exec;
var nscaleRoot = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'] + '/.nscale';

var tableChars = { 'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': '',
                   'bottom': '' , 'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': '',
                   'left': '' , 'left-mid': '' , 'mid': '' , 'mid-mid': '',
                   'right': '' , 'right-mid': '' , 'middle': ' ' };
var tableStyle = { 'padding-left': 0, 'padding-right': 0 };
process.stdin.setEncoding('utf8');


var stdoutHandler = function(out) {
  console.log(out.message.replace(/\n$/, ''));
};

var stderrHandler = function(err) {
  if (err.message) {
    console.log('ERROR: ' + err.message.replace(/\n$/, ''));
  }
  else if (err.stderr) {
    console.log('ERROR: ' + err.stderr.replace(/\n$/, ''));
  }
  else {
    console.log('ERROR: ' + JSON.stringify(err));
  }
};


function connect(next, opts) {
  var config = cfg.getConfig();

  sdk.connect({host: config.host, port: config.port, token: config.token}, function(err) {
    if (err) {
      throw err;
    }
    next(opts);
  });
}



function quit() {
  sdk.quit(function() {
    process.exit(0);
  });
}



function showHelp() {
  var file = path.join(__dirname, '../', 'docs', 'help.txt');
  fs.createReadStream(file)
    .pipe(process.stdout);
}


function login() {
  var config = cfg.getConfig();

  sdk.connect({host: config.host, port: config.port}, function() {
    sdk.login('', '', function(result) {
      if (result.user && result.user.token) {
        cfg.setToken(result.user.token);
        console.log('ok');
      }
      else {
        console.log();
        console.log('error: ' + JSON.stringify(result.err));
        console.log();
      }
      quit();
    });
  });
}

var responseOk = function(resp) {
  if (resp && resp.ok !== undefined) {
    if (!resp.ok) {
      console.log();
      console.log('ERROR: ' + JSON.stringify(resp.err));
      console.log();
      return false;
    }
  }
  return true;
};


var listSystems = function() {
  sdk.ioHandlers(stdoutHandler, stderrHandler);
  var table = new cliTable({chars: tableChars, style: tableStyle,
                            head: ['Name', 'Id'], colWidths: [30, 50]});
  sdk.listSystems(function(systems) {
    if (responseOk(systems)) {
      _.each(systems, function(system) {
        table.push([system.name, system.id]);
      });
      console.log(table.toString());
    }
    quit();
  });
};



var listContainers = function(args) {
  var table = new cliTable({chars: tableChars, style: tableStyle,
                            head: ['Name', 'Type', 'Id', 'Version', 'Dependencies'], colWidths: [20, 15, 50, 15, 70]});

  fetchSys(1, args);

  sdk.listContainers(args._[0], function(containers) {
    var name;
    var type;
    var id;
    var version;
    var deps;
    _.each(containers, function(container) {
      name = container.name || '-';
      type = container.type ||  '-';
      id = container.id || '-';
      version = container.version || '';
      deps = container.dependencies || '';
      table.push([name, type, id, version, JSON.stringify(deps)]);
    });
    console.log(table.toString());
    quit();
  });
};



var getDeployed = function(args) {
  sdk.ioHandlers(stdoutHandler, stderrHandler);

  fetchSys(1, args);

  sdk.getDeployed(args._[0], function(system) {
    console.log(JSON.stringify(system, null, 2));
    quit();
  });
};



var createSystem = function() {
  sdk.ioHandlers(stdoutHandler, stderrHandler);
  prompt.start();
  prompt.get(['name'], function(err, r1) {
    prompt.get(['namespace'], function(err, r2) {
      if (!r1.name || r1.name.length === 0) {
        console.log('aborted - you must provide a name');
        return quit();
      }
      if (!r2.namespace || r2.namespace.length === 0) {
        console.log('aborted - you must provide a namespace');
        return quit();
      }
      console.log('create system: ' + r1.name + ' with namespace: ' + r2.namespace + '?');
      var key = 'confirm (y/n)';
      prompt.get([key], function(err, r3) {
        if (r3[key] === 'y' || r3[key] === 'Y') {
          sdk.createSystem(r1.name, r2.namespace, process.cwd(), function(system) {
            if (responseOk(system)) {
              if (system.id) {
                console.log('ok');
              }
            }
            quit();
          });
        }
        else {
          console.log('aborted');
          quit();
        }
      });
    });
  });
};


var putSystem = function() {
  sdk.ioHandlers(stdoutHandler, stderrHandler);
  var sys = '';
  process.stdin.on('readable', function() {
    sys += process.stdin.read();
  });

  process.stdin.on('end', function() {
    sdk.putSystem(sys, function(response) {
      console.log(response.result);
      if (response.err) { console.log(response.err); }
      quit();
    });
  });
};



var cloneSystem = function(args) {
  sdk.ioHandlers(stdoutHandler, stderrHandler);
  sdk.cloneSystem(args._[0], process.cwd(), function(response) {
    if (responseOk(response)) {
      console.log(response.result);
    }
    quit();
  });
};



var syncSystem = function(args) {
  sdk.ioHandlers(stdoutHandler, stderrHandler);
  sdk.syncSystem(args._[0], function(response) {
    console.log(response.result);
    if (response.err) { console.log(response.err); }
    console.log(JSON.stringify(response, null, 2));
    quit();
  });
};




var buildContainer = function(args) {
  fetchSys(2, args);

  sdk.ioHandlers(stdoutHandler, stderrHandler);

  sdk.buildContainer(args._[0], args._[1],function(response) {
    if (responseOk(response)) {
      if (response) {
        console.log(response.result);
      }
    }
    quit();
  });
};



var listRevisions = function(args) {

  fetchSys(1, args);

  sdk.ioHandlers(stdoutHandler, stderrHandler);
  var table = new cliTable({chars: tableChars, style: tableStyle,
                            head: ['revision', 'deployed', 'who', 'time', 'description'],
                            //colWidths: [40, 8, 55, 25, 100]});
                            colWidths: [20, 8, 55, 25, 50]});

  sdk.listRevisions(args._[0], function(revisions) {
    _.each(revisions, function(revision){
      if (revision.deployed) {
        table.push([revision.id, revision.deployed, revision.author, revision.date, revision.message.trim()]);
      }
      else {
        table.push([revision.id, false, revision.author, revision.date, revision.message.trim()]);
      }
    });
    console.log(table.toString());
    quit();
  });
};



var getRevision = function(args) {

  fetchSys(2, args);

  sdk.ioHandlers(stdoutHandler, stderrHandler);
  sdk.getRevision(args._[0], args._[1], function(revisions) {
    console.log(JSON.stringify(revisions, null, 2));
    quit();
  });
};



var listTimeline = function(args) {
  sdk.ioHandlers(stdoutHandler, stderrHandler);
  var table = new cliTable({chars: tableChars,
                            style: tableStyle,
                            head: ['Timestamp', 'User', 'Action', 'Details'],
                            colWidths: [40, 20, 20, 60]});

  sdk.timeline(args._[0], function(timeline) {
    _.each(timeline.entries.reverse(), function(entry){
      table.push(['' + entry.ts, entry.user.name, entry.type, entry.details]);
    });
    console.log(table.toString());
    quit();
  });
};



var deployRevision = function(args) {

  fetchSys(2, args);

  sdk.ioHandlers(stdoutHandler, stderrHandler);
  sdk.deployRevision(args._[0], args._[1], function(result) {
    if (responseOk(result)) {
      if (result) {
        console.log(JSON.stringify(result, null, 2));
      }
    }
    quit();
  });
};



var markRevisionDeployed = function(args) {

  fetchSys(2, args);

  sdk.ioHandlers(stdoutHandler, stderrHandler);
  sdk.markRevision(args._[0], args._[1], function(result) {
    if (result) {
      console.log(JSON.stringify(result, null, 2));
    }
    quit();
  });
};



var previewRevision = function(args) {

  fetchSys(2, args);
  sdk.ioHandlers(stdoutHandler, stderrHandler);
  sdk.previewRevision(args._[0], args._[1], function(operations) {

    if (responseOk(operations)) {
      console.log();
      var table = new cliTable({chars: tableChars, style: tableStyle, head: ['Command', 'Id'], colWidths: [30, 50]});
      console.log('execution plan: ');
      _.each(operations.plan, function(element) {
        table.push([element.cmd, element.id]);
      });
      console.log(table.toString());
      console.log();

      var opsTable = new cliTable({chars: tableChars, style: tableStyle, head: ['Host', 'Command'], colWidths: [20, 150]});
      console.log('operations: ');
      _.each(operations.ops, function(operation) {
        opsTable.push([operation.host, operation.cmd]);
      });
      console.log(opsTable.toString());
      console.log();
    }
    quit();
  });
};



var analyzeSystem = function(args) {
  fetchSys(1, args);

  sdk.ioHandlers(stdoutHandler, stderrHandler);
  sdk.analyzeSystem(args._[0], function(result) {
    console.log(result);
    if (result) {
      console.log(JSON.stringify(result, null, 2));
    }
    quit();
  });
};



var checkSystem = function(args) {

  fetchSys(1, args);
  sdk.ioHandlers(stdoutHandler, stderrHandler);
  sdk.checkSystem(args._[0], function(operations) {
    console.log();

    if (operations.plan.length > 0) {
      console.log('Deviation from deployed revision detected!');
      console.log('Remedial action plan as follows:');
      console.log();
      var table = new cliTable({chars: tableChars, style: tableStyle, head: ['Command', 'Id'], colWidths: [30, 50]});
      console.log('execution plan: ');
      _.each(operations.plan, function(element) {
        table.push([element.cmd, element.id]);
      });
      console.log(table.toString());
      console.log();

      var opsTable = new cliTable({chars: tableChars, style: tableStyle, head: ['Host', 'Command'], colWidths: [20, 150]});
      console.log('operations: ');
      _.each(operations.ops, function(operation) {
        opsTable.push([operation.host, operation.cmd]);
      });
      console.log(opsTable.toString());
      console.log();
      console.log('run \'system fix\' to execute');
    }
    else {
      console.log('Looking good! No deviation detected');
    }
    console.log();
    quit();
  });
};



var fixSystem = function(args) {
  fetchSys(1, args);
  sdk.ioHandlers(stdoutHandler, stderrHandler);
  sdk.fixSystem(args._[0], function(result) {
    console.log();
    if (responseOk(result)) {
      console.log('Fix completed, run \'system check\' to confirm');
    }
    console.log();
    quit();
  });
};



var logout = function() {
  cfg.clearToken();
  process.exit(0);
};



var useSystem = function(args) {
  var port = args._[1];
  var config;

  if (!port) {
    port = 3223;
  }
  if (args._[0]) {
    cfg.use(args._[0], port);
  }
  else {
    config = cfg.getConfig();
    console.log('using: ' + config.host + ' ' + config.port);
  }
  process.exit(0);
};

function startServer(args) {
  console.log('nscale servers starting..');

  var config = args._[0] || nscaleRoot + '/config/config.json';

  function start() {
    var logDir = nscaleRoot + '/log';
    var server = 'nsd-server -c ' + config + ' > ' + logDir + '/server.log 2>&1 &';
    if (args.sudo) {
      server = 'sudo SSH_AUTH_SOCK=$SSH_AUTH_SOCK ' + server;
    }
    // stdio: 'inherit' is needed to make sudo work
    exec(server, { stdio: 'inherit' } );
    exec('nsd-api -c ' + config + ' > ' + logDir + '/api.log 2>&1 &', { stdio: 'inherit' } );
    exec('nsd-web -c ' + config + ' > ' + logDir + '/web.log 2>&1 &', { stdio: 'inherit' } );
    console.log('nscale servers started');
  }

  // if config is default config then check if it exists, if not then run nsd-init before starting
  if (config === nscaleRoot + '/config/config.json' && (!fs.existsSync(config)) ) {
    var initProcess = exec('nsd-init');
    initProcess.on('exit', start);
  }
  else {
    start();
  }
}

function stopServer(args) {

  console.log('nscale servers stopping..');


  var killAll = 'kill $(ps aux | grep -E \'nscale|nsd\' | awk \'{print $2}\')';

  if (args.sudo) {
    killAll = 'sudo ' + killAll;
  }

  exec(killAll, { sdtio: 'inherit' }); // we will be killed

  console.log('nscale servers stopped');
}

function logServer(args) {
  var logDir = nscaleRoot + '/log';
  var logfile = args[2] || 'server.log';
  var logProcess = exec('tail -f ' + logDir + '/' + logfile);
  logProcess.stdout.pipe(process.stdout);
}

program.register('server start', startServer);
program.register('server stop', stopServer);
program.register('server logs', logServer);

program.register('system list', connect.bind(null, listSystems));
program.register('system put', connect.bind(null, putSystem));
program.register('system create', connect.bind(null, createSystem));
program.register('system sync', connect.bind(null, syncSystem));
program.register('system clone', connect.bind(null, cloneSystem));
program.register('system current', connect.bind(null, getDeployed));
program.register('system analyze', connect.bind(null, analyzeSystem));
program.register('system check', connect.bind(null, checkSystem));
program.register('system fix', connect.bind(null, fixSystem));
program.register('system use', useSystem);

program.register('container list', connect.bind(null, listContainers));
program.register('container build', connect.bind(null, buildContainer));

program.register('revision list', connect.bind(null, listRevisions));
program.register('revision get', connect.bind(null, getRevision));
program.register('revision deploy', connect.bind(null, deployRevision));
program.register('revision mark', connect.bind(null, markRevisionDeployed));
program.register('revision preview', connect.bind(null, previewRevision));

program.register('timeline list', connect.bind(null, listTimeline));

program.register('login', login);
program.register('logout', logout);
program.register('use', useSystem);

program.register('help', showHelp);



module.exports = function(argv) {
  var remaining = program.parse(argv);
  if (remaining) {
    console.log('No matching command.');
    showHelp();
  }
};

if (require.main === module) {
  module.exports(process.argv.slice(2));
}

