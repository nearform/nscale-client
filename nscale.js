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
var inquirer = require('inquirer');
var cfg = require('./lib/config');
var fetcher = require('./lib/fetchSys')();
var exec = require('child_process').exec;
var async = require('async');
var username = require('username');
var chalk = require('chalk');
var running = require('is-running');
var serverController = require('./lib/serverController')();
var portscanner = require('portscanner');
var nscaleRoot = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'] + '/.nscale';
var Insight = require('insight');

var pkg = require('./package.json');

var fetchSys = fetcher.fetchSys;
var currentSys = require('./lib/fetchSys').currentSys;

var insight = new Insight({
    // Google Analytics tracking code
    trackingCode: 'UA-29381785-3',
    packageName: pkg.name,
    packageVersion: pkg.version
});

var tableChars = { 'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': '',
                   'bottom': '' , 'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': '',
                   'left': '' , 'left-mid': '' , 'mid': '' , 'mid-mid': '',
                   'right': '' , 'right-mid': '' , 'middle': ' ' };
var tableStyle = { 'padding-left': 0, 'padding-right': 0 };
var callbackCalled = false;
process.stdin.setEncoding('utf8');

fetcher.on('error', function(err) {
  console.log(err.message);
  callbackCalled = true;
  process.exit(1);
});

process.on('exit', function() {
  if (!callbackCalled) {
    throw new Error('callback not called');
  }
});



var stdoutHandler = function(out) {
  if (typeof out.message === 'string') {
    if (out.message.length > 2) {
      console.log(out.message.replace(/\n+$/, ''));
    }
  }
  else {
    console.log(out.message);
  }
};


var stderrHandler = function(err) {
  callbackCalled = true;
  if (err.message) {
    console.log('ERROR: ' + err.message.replace(/\n+$/, ''));
  }
  else if (err.stderr) {
    if (_.isObject(err.stderr)) {
      process.stdout.write(JSON.stringify(err.stderr, null, 2));
    }
    else {
      process.stdout.write(err.stderr);
      process.stdout.write('\n');
    }
  }
  else {
    console.log('ERROR: ' + JSON.stringify(err));
  }
};



function _quit(err) {
  var needsError = callbackCalled;

  function done() {
    if (err && !needsError) {
      console.log('not ok!');
      stderrHandler(err);
      process.exit(1);
    }
    process.exit(0);
  }

  callbackCalled = true;
  if (sdk.connected) {
    sdk.quit(done);
  }
  else {
    done();
  }
}

function quit(err) {
  if (err) {
    insight.track('error', err.message);
  }

  // because of analytics tracking
  // we need to wait ~100ms for it to complete
  setTimeout(_quit.bind(null, err), 100);
}



function connect(next, opts) {
  var server = 'nscale-kernel';

  serverController.serverStatus(server, function(err, status) {
    if (err) { return quit(err); }

    if (status.running) {
      var config = cfg.getConfig();

      sdk.on('error', function(err) {
        console.error('Server disconnected with an error:');
        quit(err);
      });

      // Server shouldn't disconnect before we do, and after we disconnect we
      // `process.exit`, so if it does it's an error condition.
      sdk.on('end', function() {
        quit(new Error('Server disconnected abruptly.'));
      });

      sdk.connect({host: config.host, port: config.port, token: config.token}, function(err) {
        if (err) {
          quit(err);
        }
        next(opts);
      });
    }
    else {
      quit(Error(server + ' is not running - use ' + chalk.green('`nscale start`') + ' first'));
    }
  });
}



function showHelp() {
  insight.track('help')
  var file = path.join(__dirname, './', 'docs', 'help.txt');
  process.stdout.write(fs.readFileSync(file));
  quit();
}


function version() {
  [
    'nscale/package.json',
    'nscale/node_modules/nscale-kernel/package.json',
    './package.json',
  ].forEach(function(p) {
    try {
      var p = require(p);
      var tabs = '\t';

      if (p.name.length < 8)
        tabs += '\t';

      console.log(chalk.green(p.name), tabs, p.version);
    } catch(err) {
      // swallow the error, if a package is missing we don't print it
    }
  });

  quit();
}


function login() {
  insight.track('login');

  sdk.login('', '', function(err, result) {
    if (result && result.user && result.user.token) {
      cfg.setToken(result.user.token);
      console.log('done');
    }
    else if (result && result.err) {
      console.log();
      console.log('error: ' + JSON.stringify(result.err));
      console.log();
    }
    quit();
  });
}

var listSystems = function() {
  insight.track('system', 'list');

  sdk.ioHandlers(stdoutHandler, stderrHandler);
  var table = new cliTable({chars: tableChars, style: tableStyle,
                            head: ['Name', 'Id'], colWidths: [30, 50]});
  sdk.listSystems(function(err, systems) {
    if (err) {
      return quit(err);
    }

    _.each(systems, function(system) {
      table.push([system.name, system.id]);
    });
    console.log(table.toString());
    quit();
  });
};


var fetchContainerSysRev = function(args) {
  var sys;
  var revision;
  var localSys = currentSys();

  if (args._.length === 0) {
    sys = localSys;
    revision = 'latest';
  } else if (args._.length === 1) {
    if (!localSys || args._[0] === localSys) {
      sys = args._[0];
      revision = 'latest';
    } else {
      sys = localSys;
      revision = args._[0];
    }
  } else {
    sys = args._[0];
    revision = args._[1];
  }

  if (!sys) {
    console.error('please specify a system')
    quit();
    return;
  }

  return {
    sys: sys,
    revision: revision
  }
};

var listContainers = function(args) {
  insight.track('container', 'list');

  sdk.ioHandlers(stdoutHandler, stderrHandler);
  var table = new cliTable({chars: tableChars, style: tableStyle,
                            head: ['Name', 'Type', 'Id'], colWidths: [20, 20, 50]});


  var sr = fetchContainerSysRev(args);
  if (!sr) { return; }

  sdk.listContainers(sr.sys, sr.revision, function(err, containers) {
    if (err) {
      return quit(err);
    }

    _.each(containers, function(container) {
      var name = container.name || '-';
      var type = container.type ||  '-';
      var id = container.id || '-';
      table.push([name, type, id]);
    });
    console.log(table.toString());
    quit();
  });
};



var getDeployed = function(args) {
  insight.track('system', 'current');

  sdk.ioHandlers(stdoutHandler, stderrHandler);

  fetchSys(2, args);

  sdk.getDeployed(args._[0], args._[1], function(err, system) {
    if (err) {
      return quit(err);
    }

    console.log(JSON.stringify(system, null, 2));
    quit();
  });
};


function validateDockerName(value) {
  if (value.length < 4) {
    return 'name is too short, use at least 4 chars';
  }
  if (value.indexOf('-') >= 0) {
    return 'namespace cannot contain \'-\'';
  }
  return true;
}

var createSystem = function() {
  insight.track('system', 'create');
  sdk.ioHandlers(stdoutHandler, stderrHandler);
  inquirer.prompt([{
    type: 'input',
    name: 'name',
    message: 'What is the system name?',
    validate: validateDockerName
  }, {
    type: 'input',
    name: 'namespace',
    message: 'What is the system namespace?',
    default: function(values) {
      return values.name;
    },
    validate: validateDockerName
  }, {
    type: 'confirm',
    name: 'confirm',
    message: function(values) {
      return 'Confirm creating system "' + values.name + '" with namespace "' + values.namespace + '"?';
    },
    default: true
  }], function(results) {
    if (!results.confirm) {
      console.log(chalk.red('aborted'));
    }

    sdk.createSystem(results.name, results.namespace, process.cwd(), function(err, system) {
      if (!err && system && !system.id) {
        err = new Error('No system id was returned')
      }

      quit(err);
    });
  });
};



var cloneSystem = function(args) {
  insight.track('system', 'clone');

  sdk.ioHandlers(stdoutHandler, stderrHandler);
  sdk.cloneSystem(args._[0], process.cwd(), function(err, response) {
    if (err) {
      return quit(err);
    }

    console.log(response.result);
    quit();
  });
};



var linkSystem = function(args) {
  insight.track('system', 'link');

  sdk.ioHandlers(stdoutHandler, stderrHandler);
  sdk.linkSystem(args._[0] || '.', process.cwd(), function(err) {
    quit(err);
  });
};



var unlinkSystem = function(args) {
  insight.track('system', 'unlink');

  fetchSys(1, args);
  sdk.ioHandlers(stdoutHandler, stderrHandler);
  sdk.unlinkSystem(args._[0], function(err) {
    quit(err);
  });
};



var syncSystem = function(args) {
  insight.track('system', 'sync');

  sdk.ioHandlers(stdoutHandler, stderrHandler);
  sdk.syncSystem(args._[0], function(err, response) {
    if (err) {
      return quit(err);
    }

    console.log(response.result);
    console.log(JSON.stringify(response, null, 2));
    quit();
  });
};




var buildContainer = function(args) {
  insight.track('container', 'build');

  var sys;
  var revision;
  var container;
  var localSys = currentSys();
  var target;

  if (args._.length === 0) {
    console.log('please specify a container, or launch: nscale cont buildall');
    return quit();
  } else if (args._.length === 1) {
    sys = localSys;
    container = args._[0];
    revision = 'latest';
    target = 'alltargets';
  } else if (args._.length === 2) {
    if (!localSys || args._[0] === localSys) {
      sys = args._[0];
      container = args._[1];
      revision = 'latest';
    } else {
      sys = localSys;
      container = args._[0];
      revision = args._[1];
    }
    target = 'alltargets';
  } else if (args._.length === 3) {
    if (!localSys || args._[0] === localSys) {
      sys = args._[0];
      container = args._[1];
      revision = args._[2];
      target = 'alltargets';
    } else {
      sys = localSys;
      container = args._[0];
      revision = args._[1];
      target = args._[2];
    }
  } else if (args._.length === 4) {
    sys = args._[0];
    container = args._[1];
    revision = args._[2];
    target = args._[3];
  }

  if (!sys) {
    console.error('please specify a system');
    return quit();
  }

  sdk.ioHandlers(stdoutHandler, stderrHandler);

  sdk.buildContainer(sys, container, revision, target, function(err, response) {
    if (err) {
      return quit(err);
    }

    if (response && response.result) {
      console.log(response.result);
    }
    quit();
  });
};



var buildAllContainers = function(args) {
  insight.track('container', 'buildall');

  var sys;
  var revision;
  var localSys = currentSys();
  var target;

  if (args._.length === 0) {
    sys = localSys;
    revision = 'latest';
    target = 'alltargets';
  } else if (args._.length === 1) {
    if (!localSys || args._[0] === localSys) {
      sys = args._[0];
      revision = 'latest';
    } else {
      sys = localSys;
      revision = args._[0];
    }
    target = 'alltargets';
  } else if (args._.length === 2) {
    if (!localSys || args._[0] === localSys) {
      sys = args._[0];
      revision = args._[1];
      target = 'alltargets';
    } else {
      sys = localSys;
      revision = args._[0];
      target = args._[1];
    }
  } else {
    sys = args._[0];
    revision = args._[1];
    target = args._[2];
  }

  if (!sys) {
    console.error('please specify a system')
    quit();
    return;
  }

  sdk.ioHandlers(stdoutHandler, stderrHandler);

  sdk.buildAllContainers(sys, revision, target, quit);
};



var listRevisions = function(args) {
  insight.track('revision', 'list');

  fetchSys(1, args);

  sdk.ioHandlers(stdoutHandler, stderrHandler);
  var table = new cliTable({chars: tableChars, style: tableStyle,
                            head: ['revision', 'deployed', 'who', 'time', 'description'],
                            colWidths: [20, 12, 40, 25, 50]});

  sdk.listRevisions(args._[0], function(err, revisions) {
    if (err) {
      return quit(err);
    }

    _.each(revisions, function(revision){
      table.push([revision.id, revision.deployedTo || '', revision.author, revision.date, revision.message.trim()]);
    });
    console.log(table.toString());
    quit();
  });
};



var getRevision = function(args) {
  insight.track('revision', 'get');

  fetchSys(3, args);

  sdk.ioHandlers(stdoutHandler, stderrHandler);
  sdk.getRevision(args._[0], args._[1], args._[2], function(err, revisions) {
    if (err) {
      return quit(err);
    }

    console.log(JSON.stringify(revisions, null, 2));
    quit();
  });
};



var listTimeline = function(args) {
  insight.track('timeline', 'list');

  sdk.ioHandlers(stdoutHandler, stderrHandler);
  var table = new cliTable({chars: tableChars,
                            style: tableStyle,
                            head: ['Timestamp', 'User', 'Action', 'Details'],
                            colWidths: [40, 20, 20, 60]});

  fetchSys(1, args);

  sdk.timeline(args._[0], function(err, timeline) {
    if (err) {
      return quit(err);
    }

    _.each(timeline.entries.reverse(), function(entry){
      table.push(['' + entry.ts, entry.user.name, entry.type, entry.details]);
    });
    console.log(table.toString());
    quit();
  });
};



var deployRevision = function(args) {
  insight.track('revision', 'deploy');

  fetchSys(3, args);

  sdk.ioHandlers(stdoutHandler, stderrHandler);
  sdk.deployRevision(args._[0], args._[1], args._[2], function(err) {
    if (err) {
      return quit(err);
    }
    quit();
  });
};



var markRevisionDeployed = function(args) {
  insight.track('revision', 'mark');

  fetchSys(2, args);

  sdk.ioHandlers(stdoutHandler, stderrHandler);
  sdk.markRevision(args._[0], args._[1], function(err, result) {
    if (err) {
      return quit(err);
    }

    console.log(JSON.stringify(result, null, 2));
    quit();
  });
};



var previewRevision = function(args) {
  insight.track('revision', 'preview');

  fetchSys(3, args);
  sdk.ioHandlers(stdoutHandler, stderrHandler);
  sdk.previewRevision(args._[0], args._[1], args._[2], function(err, operations) {
    if (err) {
      return quit(err);
    }

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
      opsTable.push([operation.host || '', operation.cmd || '']);
    });
    console.log(opsTable.toString());
    console.log();
    quit();
  });
};



var analyzeSystem = function(args) {
  insight.track('system', 'analyze');

  fetchSys(2, args);

  sdk.ioHandlers(stdoutHandler, stderrHandler);
  sdk.analyzeSystem(args._[0], args._[1], function(err, result) {
    if (err) {
      return quit(err);
    }

    console.log(JSON.stringify(result, null, 2));
    quit();
  });
};



var checkSystem = function(args) {
  insight.track('system', 'check');

  fetchSys(2, args);
  sdk.ioHandlers(stdoutHandler, stderrHandler);
  sdk.checkSystem(args._[0], args._[1], function(err, operations) {
    if (err) {
      return quit(err);
    }

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
        opsTable.push([operation.host || '', operation.cmd || '']);
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
  insight.track('system', 'fix');

  fetchSys(2, args);
  sdk.ioHandlers(stdoutHandler, stderrHandler);
  sdk.fixSystem(args._[0], args._[1], function(err) {
    if (err) {
      return quit(err);
    }

    console.log();
    console.log('Fix completed, run \'system check\' to confirm');
    console.log();
    quit();
  });
};



var infoSystem = function(args) {
  insight.track('system', 'info');

  fetchSys(2, args);

  var table = new cliTable({chars: tableChars, style: tableStyle,
                            head: ['Name', 'Type', 'Parent', 'Info'], colWidths: [20, 20, 20, 50]});

  sdk.ioHandlers(stdoutHandler, stderrHandler);
  sdk.infoSystem(args._[0], args._[1], function(err, info) {
    if (err) {
      return quit(err);
    }

    _.each(info, function(inf) {
      table.push([inf.name, inf.type, inf.parent, inf.info]);
    });
    console.log(table.toString());
    quit();
  });
};



var stopSystem = function(args) {
  insight.track('system', 'stop');

  fetchSys(2, args);
  sdk.ioHandlers(stdoutHandler, stderrHandler);
  sdk.stopSystem(args._[0], args._[1], function(err) {
    if (err) {
      return quit(err);
    }

    console.log();
    console.log('Stop completed, run \'system check\' to confirm');
    console.log();
    quit();
  });
};



var compileSystem = function(args) {
  insight.track('system', 'compile');

  fetchSys(1, args);
  var message = args.m || args.message || 'system compile';

  sdk.ioHandlers(stdoutHandler, stderrHandler);
  sdk.compileSystem(args._[0], message, quit);
};



var logout = function() {
  insight.track('logout');
  cfg.clearToken();
  quit();
};



var useSystem = function(args) {
  insight.track('system', 'use');

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
  quit();
};

function startServer(args) {
  insight.track('server', 'start');
  console.log('nscale servers starting..');

  var servers = [
    'nscale-kernel'
  ];
  
  serverController.start(servers, quit);
}

function stopServer(args) {
  insight.track('server', 'stop');
  console.log('nscale servers stopping..');

  var servers = [
    'nscale-kernel'
  ];

  serverController.stop(servers, quit);
}

function serverStatus() {
  insight.track('server', 'status');

  var servers = [
    'nscale-kernel'
  ];

  function onNextServer(server, cb) {
    serverController.serverStatus(server, function(err, status) {
      if (err) { cb(err); }
      console.log(server, status);
      if (!status.running && status.listening) {
        console.log('Another service is running on the ' + server.replace('nscale-', '') + ' port - please check', nscaleRoot + '/config/config.json\n');
      }
      cb(null);
    });
  }

  async.eachSeries(servers, onNextServer, quit);
}

function logServer(args) {
  insight.track('server', 'logs');
  var logDir = nscaleRoot + '/log';
  var logfile = args[2] || 'kernel.log';
  var logProcess = exec('tail -n 100 -f ' + logDir + '/' + logfile);
  logProcess.stdout.pipe(process.stdout);
}

program.register('server start', startServer);
program.register('start', startServer);
program.register('server stop', stopServer);
program.register('stop', stopServer);
program.register('server logs', logServer);
program.register('logs', logServer);
program.register('server status', serverStatus);
program.register('status', serverStatus);

program.register('system list', connect.bind(null, listSystems));
program.register('system create', connect.bind(null, createSystem));
program.register('system link', connect.bind(null, linkSystem));
program.register('system unlink', connect.bind(null, unlinkSystem));
program.register('system current', connect.bind(null, getDeployed));
program.register('system analyze', connect.bind(null, analyzeSystem));
program.register('system check', connect.bind(null, checkSystem));
program.register('system fix', connect.bind(null, fixSystem));
program.register('system stop', connect.bind(null, stopSystem));
program.register('system info', connect.bind(null, infoSystem));
program.register('system compile', connect.bind(null, compileSystem));
program.register('system use', useSystem);

program.register('container list', connect.bind(null, listContainers));
program.register('container build', connect.bind(null, buildContainer));
program.register('container buildall', connect.bind(null, buildAllContainers));

program.register('revision list', connect.bind(null, listRevisions));
program.register('revision get', connect.bind(null, getRevision));
program.register('revision deploy', connect.bind(null, deployRevision));
program.register('revision mark', connect.bind(null, markRevisionDeployed));
program.register('revision preview', connect.bind(null, previewRevision));

program.register('timeline list', connect.bind(null, listTimeline));

program.register('login', connect.bind(null, login));
program.register('logout', logout);
program.register('use', useSystem);

program.register('help', showHelp);
program.register('version', version);



function start(argv) {

  // ask for permission the first time
  if (insight.optOut === undefined) {
    return insight.askPermission(null, function() {
      console.log(); // empty line
      start(argv);
    });
  }

  var remaining = program.parse(argv);

  if (remaining && remaining.v) {
    return version();
  }
  else if (remaining) {
    console.log('No matching command.');
    return showHelp();
  }
};

module.exports = start;

if (require.main === module) {
  start(process.argv.slice(2));
}

