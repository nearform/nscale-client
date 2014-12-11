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
var nscaleRoot = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'] + '/.nscale';
var Insight = require('insight');

var pkg = require('./package.json');

var fetchSys = fetcher.fetchSys;

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
  process.exit(1)
});

process.on('exit', function() {
  if (!callbackCalled) {
    throw new Error('callback not called');
  }
});


var stdoutHandler = function(out) {
  if (typeof out.message === 'string') {
    console.log(out.message.replace(/\n$/, ''));
  }
  else {
    console.log(out.message);
  }
};


var stderrHandler = function(err) {
  callbackCalled = true;
  if (err.message) {
    console.log('ERROR: ' + err.message.replace(/\n$/, ''));
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
    'nscale/node_modules/nscale-web/package.json',
    'nscale/node_modules/nscale-api/package.json'
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

  var config = cfg.getConfig();

  sdk.connect({host: config.host, port: config.port}, function() {
    sdk.login('', '', function(err, result) {
      if (result && result.user && result.user.token) {
        cfg.setToken(result.user.token);
      }
      else if (result && result.err) {
        console.log();
        console.log('error: ' + JSON.stringify(result.err));
        console.log();
      }
      quit();
    });
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



var listContainers = function(args) {
  insight.track('container', 'list');

  var table = new cliTable({chars: tableChars, style: tableStyle,
                            head: ['Name', 'Type', 'Id', 'Version', 'Dependencies'], colWidths: [20, 15, 50, 15, 70]});

  fetchSys(1, args);

  sdk.listContainers(args._[0], function(err, containers) {
    if (err) {
      return quit(err);
    }

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
  insight.track('system', 'current');

  sdk.ioHandlers(stdoutHandler, stderrHandler);

  fetchSys(1, args);

  sdk.getDeployed(args._[0], function(err, system) {
    if (err) {
      return quit(err);
    }

    console.log(JSON.stringify(system, null, 2));
    quit();
  });
};



var createSystem = function() {
  insight.track('system', 'create');
  sdk.ioHandlers(stdoutHandler, stderrHandler);
  inquirer.prompt([{
    type: 'input',
    name: 'name',
    message: 'What is the system name?',
    validate: function(value) {
      if (value.length < 4) {
        return 'name is too short, use at least 4 chars';
      }
      return true;
    }
  }, {
    type: 'input',
    name: 'namespace',
    message: 'What is the system namespace?',
    default: function(values) {
      return values.name;
    },
    validate: function(value) {
      if (value.length < 4) {
        return 'namespace is too short, use at least 4 chars';
      }
      return true;
    }
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


var putSystem = function() {
  insight.track('system', 'put');

  sdk.ioHandlers(stdoutHandler, stderrHandler);
  var sys = '';
  process.stdin.on('readable', function() {
    sys += process.stdin.read();
  });

  process.stdin.on('end', function() {
    sdk.putSystem(sys, function(err, response) {
      if (err) {
        return quit(err);
      }

      console.log(response.result);
      quit();
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

  fetchSys(2, args);

  sdk.ioHandlers(stdoutHandler, stderrHandler);

  sdk.buildContainer(args._[0], args._[1],function(err, response) {
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

  fetchSys(1, args);

  sdk.ioHandlers(stdoutHandler, stderrHandler);

  sdk.buildAllContainers(args._[0], function(err) {
    if (err) {
      return quit(err);
    }

    quit();
  });
};



var listRevisions = function(args) {
  insight.track('revision', 'list');

  fetchSys(1, args);

  sdk.ioHandlers(stdoutHandler, stderrHandler);
  var table = new cliTable({chars: tableChars, style: tableStyle,
                            head: ['revision', 'deployed', 'who', 'time', 'description'],
                            //colWidths: [40, 8, 55, 25, 100]});
                            colWidths: [20, 8, 55, 25, 50]});

  sdk.listRevisions(args._[0], function(err, revisions) {
    if (err) {
      return quit(err);
    }

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
  insight.track('revision', 'get');

  fetchSys(2, args);

  sdk.ioHandlers(stdoutHandler, stderrHandler);
  sdk.getRevision(args._[0], args._[1], function(err, revisions) {
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

  fetchSys(2, args);

  sdk.ioHandlers(stdoutHandler, stderrHandler);
  sdk.deployRevision(args._[0], args._[1], function(err) {
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

  fetchSys(2, args);
  sdk.ioHandlers(stdoutHandler, stderrHandler);
  sdk.previewRevision(args._[0], args._[1], function(err, operations) {
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

  fetchSys(1, args);

  sdk.ioHandlers(stdoutHandler, stderrHandler);
  sdk.analyzeSystem(args._[0], function(err, result) {
    if (err) {
      return quit(err);
    }

    console.log(JSON.stringify(result, null, 2));
    quit();
  });
};



var checkSystem = function(args) {
  insight.track('system', 'check');

  fetchSys(1, args);
  sdk.ioHandlers(stdoutHandler, stderrHandler);
  sdk.checkSystem(args._[0], function(err, operations) {
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

  fetchSys(1, args);
  sdk.ioHandlers(stdoutHandler, stderrHandler);
  sdk.fixSystem(args._[0], function(err) {
    if (err) {
      return quit(err);
    }

    console.log();
    console.log('Fix completed, run \'system check\' to confirm');
    console.log();
    quit();
  });
};



var compileSystem = function(args) {
  insight.track('system', 'compile');

  fetchSys(2, args);
  sdk.ioHandlers(stdoutHandler, stderrHandler);
  sdk.compileSystem(args._[0], args._[1], quit);
};



var logout = function() {
  insight.track('logout');
  cfg.clearToken();
  process.exit(0);
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
  process.exit(0);
};

function startServer(args) {
  insight.track('server', 'start');
  console.log('nscale servers starting..');

  var config = args._[0] || nscaleRoot + '/config/config.json';
  var stat;

  var servers = [
    'nsd-server',
    'nsd-api',
    'nsd-web'
  ];

  if (fs.existsSync('/var/run/docker.sock')) {
    stat = fs.statSync('/var/run/docker.sock')
    if (process.getgroups().indexOf(stat.gid) === -1 && process.getuid() !== stat.uid) {
      console.error('unable to read and write /var/run/docker.sock, to fix run:');
      console.error('\tsudo usermod -G docker -a', username.sync());
      process.exit(1);
    }
  }

  function start() {
    var logDir = nscaleRoot + '/log';

    async.eachSeries(servers, function(server, cb) {
      var log = logDir + '/' + server.replace('nsd-', '') + '.log';
      exec(server + ' -c ' + config + ' > ' + log + ' 2>&1 &',
           { stdio: 'inherit' }, cb);
    }, function(err) {
      if (!err) {
        console.log('done!');
      }
      quit(err);
    });
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
  insight.track('server', 'start');
  console.log('nscale servers stopping..');

  var servers = [
    'nscale-kernel',
    'nscale-api',
    'nscale-web'
  ];

  async.eachSeries(servers, function(server, cb) {
    var command = 'ps aux | grep -v grep | grep -E \'' + server + '\' | awk \'{print $2}\' | xargs kill -9';
    exec(command, { stdio: 'inherit' }, function(err, data) {
      if (err && !err.message.match(/No such process/)) {
        return cb(err);
      }
      cb();
    });
  }, function(err) {
    if (!err) {
      console.log('done!')
    }
    quit(err)
  })
}

function logServer(args) {
  insight.track('server', 'logs');
  var logDir = nscaleRoot + '/log';
  var logfile = args[2] || 'server.log';
  var logProcess = exec('tail -n 100 -f ' + logDir + '/' + logfile);
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
program.register('system link', connect.bind(null, linkSystem));
program.register('system unlink', connect.bind(null, unlinkSystem));
program.register('system current', connect.bind(null, getDeployed));
program.register('system analyze', connect.bind(null, analyzeSystem));
program.register('system check', connect.bind(null, checkSystem));
program.register('system fix', connect.bind(null, fixSystem));
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

program.register('login', login);
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

