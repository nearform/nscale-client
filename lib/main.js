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

var argv = require('yargs').argv;
var _ = require('lodash');
var cliTable = require('cli-table');
var nfdsdk = require('nfd-sdk/main')();
var prompt = require('prompt');
var cfg = require('./config');
var editor = require('./editor');

var ProgressBar = require('progress');

var tableChars = { 'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': '',
                   'bottom': '' , 'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': '',
                   'left': '' , 'left-mid': '' , 'mid': '' , 'mid-mid': '',
                   'right': '' , 'right-mid': '' , 'middle': ' ' };
var tableStyle = { 'padding-left': 0, 'padding-right': 0 };
process.stdin.setEncoding('utf8');



var showHelp = function(args, cb) {
  console.log('');
  console.log('-[ login ]----------');
  console.log('login                                             - login to the nominated host');
  console.log('logout                                            - logout from the nominated host');
  console.log('use host [port]                                   - use the given host and optional port');
  console.log('help                                              - show this');
  console.log('');
  console.log('-[ system ]----------');
  console.log('create system                                     - create a new blank system');
  console.log('clone system                                      - clone a system from an existing git remote');
  console.log('add system remote                                 - add a remote url to an existing system');
  console.log('sync system                                       - pull and push to the system remote');
  console.log('delete system <systemid>                          - delete a system');
  console.log('list systems                                      - list all systems in this instance');
  console.log('put system                                        - put a new revision of the system');
  console.log('get deployed <systemid>                           - get the deployed revision of this system');
  console.log('');
  console.log('-[ container ]----------');
  console.log('put container                                     - put a new revision a container');
  console.log('list containers <systemid>                        - list all containers in this system');
  console.log('build container <systemid> <containerid>          - build a specific container');
  console.log('add container <systemid>                          - add a new container');
  console.log('edit container <systemid> <containerid>           - add a new container');
  console.log('delete container <systemid> <continaerid>         - delete a container');
  console.log('');
  console.log('-[ revision ]----------');
  console.log('get revision <systemid> <revisionid>              - get a specific revision for a system');
  console.log('list revisions <systemid>                         - list revision history for this system');
  console.log('deploy revision <systemid> <revisionid>           - deploy a specific revision of this system');
  console.log('mark revision <systemid> <revisionid>             - mark a specific revision as deployed');
  console.log('preview revision <systemid> <revisionid>          - preview the deploy operations for a specific revision of this system');
  console.log('');
  console.log('-[ timeline ]----------');
  console.log('list timeline <systemid>                          - list the timeline for this system');
  console.log('');
  console.log('-[ analysis ]----------');
  console.log('');
  console.log('analyze <systemid>                                - run an analysis for this system and output the results');
  console.log('check <systemid>                                  - run an analysis and check it against the expected deployed system configuration');
  cb();
};



var login = function(args, cb) {
  var config = cfg.getConfig();
  prompt.start();

  prompt.get([{name:'nfdlogin', description:'nfd username / password login (y/n)', pattern:'^[y|n|Y|N]$', required:true}], function(err, result) {

    if ('y' === result.nfdlogin.trim().toLowerCase()) {
      prompt.get([{name:'username', required:true}, {name:'password', required:true, hidden:true}], function(err, result) {
        nfdsdk.connect({host: config.host, port: config.port}, function() {
          nfdsdk.login(result.username, result.password, function(result) {
            if (result.user && result.user.token) {
              cfg.setToken(result.user.token);
              console.log('ok');
            }
            else {
              console.log('error: ' + result.why);
            }
            cb();
          });
        });
      });
    }
    else {
      prompt.get([{name:'token', description:'github access token', required:true}], function(err, result) {
        nfdsdk.connect({host: config.host, port: config.port}, function() {
          nfdsdk.ioHandlers(function(){}, function(err) {
            console.log(err.stderr);
            cb();
          });
          nfdsdk.githublogin(result.token, function(out) {
            if (out.user) {
              cfg.setToken(out.user.token);
            }
            else {
              console.log(JSON.stringify(out, null, 2));
            }
            cb();
          });
        });
      });
    }
  });
};



var listSystems = function(args, cb) {
  var table = new cliTable({chars: tableChars, style: tableStyle,
                            head: ['Name', 'Id'], colWidths: [30, 50]});
  nfdsdk.listSystems(function(systems) {
    _.each(systems, function(system) {
      table.push([system.name, system.id]);
    });
    console.log(table.toString());
    //console.log(JSON.stringify(systems, null, 2));
    cb();
  });
};



var listContainers = function(args, cb) {
  var table = new cliTable({chars: tableChars, style: tableStyle,
                            head: ['Name', 'Type', 'Id', 'Version', 'Dependencies'], colWidths: [20, 15, 50, 15, 70]});
  nfdsdk.listContainers(args[2], function(containers) {
    var version;
    var deps;
    _.each(containers, function(container) {
      version = container.version || '';
      deps = container.dependencies || '';
      table.push([container.name, container.type, container.id, version, JSON.stringify(deps)]);
    });
    console.log(table.toString());
    //console.log(JSON.stringify(containers, null, 2));
    cb();
  });
};



var getDeployed = function(args, cb) {
  nfdsdk.getDeployed(args[2], function(system) {
    //console.log(system.guid + ' ' + system.description);
    console.log(JSON.stringify(system, null, 2));
    cb();
  });
};



var createSystem = function(args, cb) {
  prompt.start();
  prompt.get(['name'], function(err, r1) {
    prompt.get(['namespace'], function(err, r2) {
      console.log('create system: ' + r1.name + ' with namespace: ' + r2.namespace + ' ?');
      prompt.get(['confirm'], function(err, r3) {
        if (r3.confirm === 'y' || r3.confirm === 'Y') {
          nfdsdk.createSystem(r1.name, r2.namespace, function(system) {
            if (system.id) {
              console.log('ok');
            }
            else {
              console.log('error: unspecified');
            }
            cb();
          });
        }
        else {
          cb();
        }
      });
    });
  });
};



var deleteSystem = function(args, cb) {
  nfdsdk.deleteSystem(args[2], function(/*result*/) {
    console.log('ok');
    //console.log(JSON.stringify(result, null, 2));
    cb();
  });
};



var putSystem = function(args, cb) {
  var sys = '';
  process.stdin.on('readable', function() {
    sys += process.stdin.read();
  });

  process.stdin.on('end', function() {
    nfdsdk.putSystem(sys, function(response) {
      console.log(response.result);
      if (response.err) { console.log(response.err); }
      //console.log(JSON.stringify(response, null, 2));
      cb();
    });
  });
};



var cloneSystem = function(args, cb) {
  nfdsdk.cloneSystem(args[2], function(response) {
    console.log(response.result);
    if (response.err) { console.log(response.err); }
    //console.log(JSON.stringify(response, null, 2));
    cb();
  });
};



var syncSystem = function(args, cb) {
  nfdsdk.syncSystem(args[2], function(response) {
    console.log(response.result);
    if (response.err) { console.log(response.err); }
    console.log(JSON.stringify(response, null, 2));
    cb();
  });
};



var putContainer = function(args, cb) {
  var sys = '';
  process.stdin.on('readable', function() {
    sys += process.stdin.read();
  });

  process.stdin.on('end', function() {
    nfdsdk.putContainer(args[2], sys, function(response) {
      console.log(response.result);
      if (response.err) { console.log(response.err); }
      //console.log(JSON.stringify(response, null, 2));
      cb();
    });
  });
};



var addContainer = function(args, cb) {
  prompt.start();
  prompt.get(['type'], function(err, result) {
    editor.create(result.type, function(container) {
      nfdsdk.addContainer(args[2], JSON.stringify(container), function(response) {
        console.log(response.result);
        if (response.err) { console.log(response.err); }
        console.log(JSON.stringify(response, null, 2));
        cb();
      });
    });
  });
};



/*
 * need a get container end point in the protocol
var editContainer = function(args, cb) {

  editor.create(result.type, function(container) {
    nfdsdk.addContainer(args[2], JSON.stringify(container), function(response) {
        console.log(response.result);
        if (response.err) { console.log(response.err); }
        console.log(JSON.stringify(response, null, 2));
        cb();
      });
    });
  });
};
*/


var deleteContainer = function(args, cb) {
  nfdsdk.deleteContainer(args[2], args[3], function(response) {
    console.log(response.result);
    if (response.err) { console.log(response.err); }
    //console.log(JSON.stringify(response, null, 2));
    cb();
  });
};



var buildContainer = function(args, cb) {
  nfdsdk.buildContainer(args[2], args[3],function(response) {
    console.log();
    if (response) {
      console.log(response.result);
      if (response.err) { console.log(response.err); }
      //console.log(JSON.stringify(response, null, 2));
    }
    cb();
  });
};



var listRevisions = function(args, cb) {
  var table = new cliTable({chars: tableChars, style: tableStyle,
                            head: ['revision', 'deployed', 'who', 'time', 'description'],
                            //colWidths: [40, 8, 55, 25, 100]});
                            colWidths: [20, 8, 55, 25, 50]});
  nfdsdk.listRevisions(args[2], function(revisions) {
    _.each(revisions, function(revision){
      if (revision.deployed) {
        table.push([revision.id, revision.deployed, revision.author, revision.date, revision.message.trim()]);
      }
      else {
        table.push([revision.id, false, revision.author, revision.date, revision.message.trim()]);
      }
    });
    console.log(table.toString());
    cb();
  });
};



var getRevision = function(args, cb) {
  nfdsdk.getRevision(args[2], args[3], function(revisions) {
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



var listTimeline = function(args, cb) {
  var table = new cliTable({chars: tableChars,
                            style: tableStyle,
                            head: ['Timestamp', 'User', 'Action', 'Details'],
                            colWidths: [40, 20, 20, 60]});

  nfdsdk.timeline(args[2], function(timeline) {
    _.each(timeline.entries.reverse(), function(entry){
      table.push(['' + entry.ts, entry.user.name, entry.type, entry.details]);
    });
    console.log(table.toString());
    cb();
  });
};



var deploySystem = function(args, cb) {
  nfdsdk.deploySystem(args[2], args[3], function(result) {
    if (result) {
      console.log(JSON.stringify(result, null, 2));
    }
    cb();
  });
};



var markRevisionDeployed = function(args, cb) {
  nfdsdk.markRevision(args[2], args[3], function(result) {
    if (result) {
      console.log(JSON.stringify(result, null, 2));
    }
    cb();
  });
};



var previewSystemDeploy = function(args, cb) {
  nfdsdk.previewSystemDeploy(args[2], args[3], function(operations) {
    console.log();

    console.log('execution plan: ');
    _.each(operations.plan, function(element) {
      console.log(element.cmd + ' ' + element.id);
    });
    console.log();

    console.log('operations: ');
    _.each(operations.ops, function(operation) {
      console.log('host: ' + operation.host + ' cmd: ' + operation.cmd);
    });
    console.log();
    cb();
  });
};



var analyzeSystem = function(args, cb) {
  nfdsdk.analyzeSystem(args[2], function(result) {
    if (result) {
      console.log(JSON.stringify(result, null, 2));
    }
    cb();
  });
};



var checkSystem = function(args, cb) {
  nfdsdk.checkSystem(args[2], function(result) {
    if (result) {
      console.log(JSON.stringify(result, null, 2));
    }
    cb();
  });
};



var logout = function(args, cb) {
  cfg.clearToken();
  cb();
};



/*
 * revoke will revoke all remote access to a system and reset secrets
 */
//var revoke = function(args, cb) {
//};



var useSystem = function(args, cb) {
  var port = args[2];
  var config;

  if (!port) {
    port = 3223;
  }
  if (args[1]) {
    cfg.use(args[1], port);
  }
  else {
    config = cfg.getConfig();
    console.log('using: ' + config.host + ' ' + config.port);
  }
  cb();
};



var map = {list: {systems: listSystems,
                  containers: listContainers,
                  revisions: listRevisions,
                  timeline: listTimeline},
           get: {deployed: getDeployed,
                 revision: getRevision},
           put: {system: putSystem,
                 container: putContainer},
           create: {system: createSystem},
           sync: {system: syncSystem},
           mark: {revision: markRevisionDeployed},
           add: {container: addContainer,
                 timeline: addToTimeline},
           delete: {system: deleteSystem,
                    container: deleteContainer},
           //edit: {container: editContainer},
           build: {container: buildContainer},
           analyze: {system: analyzeSystem},
           check: {system: checkSystem},
           deploy: {revision: deploySystem},
           preview: {revision: previewSystemDeploy},
           clone: {system: cloneSystem},
           login: login,
           logout: logout,
           use: useSystem,
           help: showHelp};



var runCommand = function(cmd, cb) {
  if (map[cmd[0]] && _.isFunction(map[cmd[0]])) {
    map[cmd[0]](cmd, function() {
      cb();
    });
  }
  else if (map[cmd[0]] && map[cmd[0]][cmd[1]] && _.isFunction(map[cmd[0]][cmd[1]])) {
    map[cmd[0]][cmd[1]](cmd, function() {
      cb();
    });
  }
  else {
    console.log('error: command not available');
    cb();
  }
};



var stdoutHandler = function(/*out*/) {
//  process.stdout.write("Downloading " + data.length + " bytes\r");
//  console.log(out.responseType + ':' + out.level + ': ' + out.stdout);
  //process.stdout.write(out.responseType + ':' + out.level + ': ' + out.stdout + '\r\r');
};



var stderrHandler = function(err) {
  if (err.stderr.indexOf('semver') !== -1) {
    console.log(err.responseType + ':' + err.level + ': ' + err.stderr);
  }
};



var currentProgressMade = 0;
var pbar;
var curryProgressHandler = function(type) {
  return function(out) {
    if (out.level === 'progress') {
      if (out.stdout === 0) {
        currentProgressMade = 0;
        pbar = new ProgressBar(type + ' [:bar] :percent :etas', {
          complete: '=',
          incomplete: ' ',
          width: 50,
          total: 100
        });
      }
      else {
        pbar.tick(out.stdout - currentProgressMade);
        currentProgressMade = out.stdout;
      }
    }
    else if (out.level === 'warn' || out.level === 'error') {
      console.log();
      console.log(out.responseType + ':' + out.level + ': ' + out.stdout);
    }
  };
};



exports.main = function() {
  var config = cfg.getConfig();

  if (argv._[0] === 'help' || argv._[0] === 'use' || argv._[0] === 'login') {
    runCommand(argv._, function() {
      process.exit(0);
    });
  }
  else {
    nfdsdk.connect({host: config.host, port: config.port, token: config.token}, function() {
      if (argv._[0] === 'deploy') {
        nfdsdk.ioHandlers(curryProgressHandler('deploying'), stderrHandler);
      }
      else if (argv._[0] === 'build') {
        nfdsdk.ioHandlers(curryProgressHandler('building'), stderrHandler);
      }
      else {
        nfdsdk.ioHandlers(stdoutHandler, stderrHandler);
      }
      runCommand(argv._, function() {
        nfdsdk.quit(function() {
          process.exit(0);
        });
      });
    });
  }
};


