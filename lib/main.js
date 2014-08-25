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

var program = require('commist')();
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


var stdoutHandler = function(/*out*/) {
//  process.stdout.write("Downloading " + data.length + " bytes\r");
//  console.log(out.responseType + ':' + out.level + ': ' + out.stdout);
  //process.stdout.write(out.responseType + ':' + out.level + ': ' + out.stdout + '\r\r');
};



var stderrHandler = function(err) {
  console.error(err.stderr);
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



function connect(next, opts) {
  var config = cfg.getConfig();

  nfdsdk.connect({host: config.host, port: config.port, token: config.token}, function(err) {
    if (err) {
      throw err;
    }
    next(opts);
  });
}



function quit() {
  nfdsdk.quit(function() {
    process.exit(0);
  });
}



function showHelp() {
  console.log('');
  console.log('-[ login ]----------');
  console.log('login                                             - login to the nominated host');
  console.log('logout                                            - logout from the nominated host');
  console.log('use host [port]                                   - use the given host and optional port');
  console.log('help                                              - show this');
  console.log('');
  console.log('-[ system ]----------');
  console.log('system create                                     - create a new blank system');
  console.log('system clone                                      - clone a system from an existing git remote');
  // FIXME this command is not exposed
  //console.log('add system remote                                 - add a remote url to an existing system');
  console.log('system sync                                       - pull and push to the system remote');
  // disabled by @mcollina
  //console.log('system delete <systemid>                          - delete a system');
  console.log('system list                                       - list all systems in this instance');
  console.log('system put                                        - put a new revision of the system');
  console.log('system deployed <systemid>                        - get the deployed revision of this system');
  console.log('system analyze <systemid>                         - run an analysis for this system and output the results');
  console.log('system check <systemid>                           - run an analysis and check it against the expected deployed system configuration');
  console.log('');
  console.log('-[ container ]----------');
  console.log('container put                                     - put a new revision a container');
  console.log('container list <systemid>                         - list all containers in this system');
  console.log('container build <systemid> <containerid>          - build a specific container');
  //console.log('container add <systemid>                          - add a new container');
  console.log('container edit <systemid> <containerid>           - edit a container');
  console.log('container delete <systemid> <continaerid>         - delete a container');
  console.log('');
  console.log('-[ revision ]----------');
  console.log('revision get <systemid> <revisionid>              - get a specific revision for a system');
  console.log('revision list <systemid>                          - list revision history for this system');
  console.log('revision deploy <systemid> <revisionid>           - deploy a specific revision of this system');
  console.log('revision mark <systemid> <revisionid>             - mark a specific revision as deployed');
  console.log('revision preview <systemid> <revisionid>          - preview the deploy operations for a specific revision of this system');
  console.log('');
  console.log('-[ remote ]----------');
  console.log('remote add <systemid> <url>                       - add a remote to an existing system');
  console.log('');
  console.log('-[ timeline ]----------');
  console.log('timeline list <systemid>                          - list the timeline for this system');
  console.log('');
  process.exit(0);
}


function login() {
  var config = cfg.getConfig();

  nfdsdk.connect({host: config.host, port: config.port}, function() {
    nfdsdk.login('', '', function(result) {
      if (result.user && result.user.token) {
        cfg.setToken(result.user.token);
        console.log('ok');
      }
      else {
        console.log('error: ' + result.why);
      }
      quit();
    });
  });

/*
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
            quit();
          });
        });
      });
    }
    else {
      prompt.get([{name:'token', description:'github access token', required:true}], function(err, result) {
        nfdsdk.connect({host: config.host, port: config.port}, function() {
          nfdsdk.ioHandlers(function(){}, function(err) {
            console.log(err.stderr);
            quit();
          });
          nfdsdk.githublogin(result.token, function(out) {
            if (out.user) {
              cfg.setToken(out.user.token);
            }
            else {
              console.log(JSON.stringify(out, null, 2));
            }
            quit();
          });
        });
      });
    }
  });
*/
}



var listSystems = function() {

  nfdsdk.ioHandlers(stdoutHandler, stderrHandler);

  var table = new cliTable({chars: tableChars, style: tableStyle,
                            head: ['Name', 'Id'], colWidths: [30, 50]});
  nfdsdk.listSystems(function(systems) {
    _.each(systems, function(system) {
      table.push([system.name, system.id]);
    });
    console.log(table.toString());
    quit();
  });
};



var listContainers = function(args) {
  var table = new cliTable({chars: tableChars, style: tableStyle,
                            head: ['Name', 'Type', 'Id', 'Version', 'Dependencies'], colWidths: [20, 15, 50, 15, 70]});
  nfdsdk.listContainers(args._[0], function(containers) {
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
  nfdsdk.ioHandlers(stdoutHandler, stderrHandler);
  nfdsdk.getDeployed(args._[0], function(system) {
    //console.log(system.guid + ' ' + system.description);
    console.log(JSON.stringify(system, null, 2));
    quit();
  });
};



var createSystem = function() {
  nfdsdk.ioHandlers(stdoutHandler, stderrHandler);
  prompt.start();
  prompt.get(['name'], function(err, r1) {
    prompt.get(['namespace'], function(err, r2) {
      console.log('create system: ' + r1.name + ' with namespace: ' + r2.namespace + '?');
      var key = 'confirm (y/n)';
      prompt.get([key], function(err, r3) {
        if (r3[key] === 'y' || r3[key] === 'Y') {
          nfdsdk.createSystem(r1.name, r2.namespace, function(system) {
            if (system.id) {
              console.log('ok');
            }
            else {
              console.log('error: unspecified');
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



/*
var deleteSystem = function(args) {
  nfdsdk.deleteSystem(args._[0], function(result) {
    console.log('ok');
    //console.log(JSON.stringify(result, null, 2));
    quit();
  });
};
*/



var putSystem = function() {
  nfdsdk.ioHandlers(stdoutHandler, stderrHandler);
  var sys = '';
  process.stdin.on('readable', function() {
    sys += process.stdin.read();
  });

  process.stdin.on('end', function() {
    nfdsdk.putSystem(sys, function(response) {
      console.log(response.result);
      if (response.err) { console.log(response.err); }
      //console.log(JSON.stringify(response, null, 2));
      quit();
    });
  });
};



var cloneSystem = function(args) {
  nfdsdk.ioHandlers(stdoutHandler, stderrHandler);
  nfdsdk.cloneSystem(args._[0], function(response) {
    console.log(response.result);
    if (response.err) { console.log(response.err); }
    //console.log(JSON.stringify(response, null, 2));
    quit();
  });
};



var syncSystem = function(args) {
  nfdsdk.ioHandlers(stdoutHandler, stderrHandler);
  nfdsdk.syncSystem(args._[0], function(response) {
    console.log(response.result);
    if (response.err) { console.log(response.err); }
    console.log(JSON.stringify(response, null, 2));
    quit();
  });
};



//var putContainer = function(args) {
//  nfdsdk.ioHandlers(stdoutHandler, stderrHandler);
//  var sys = '';
//  process.stdin.on('readable', function() {
//    sys += process.stdin.read();
//  });
//
//  process.stdin.on('end', function() {
//    nfdsdk.putContainer(args._[0], sys, function(response) {
//      console.log(response.result);
//      if (response.err) { console.log(response.err); }
//      //console.log(JSON.stringify(response, null, 2));
//      quit();
//    });
//  });
//};



//var addContainer = function(args) {
//  nfdsdk.ioHandlers(stdoutHandler, stderrHandler);
//  prompt.start();
//  prompt.get(['type'], function(err, result) {
//    editor.create(result.type, function(container) {
//      nfdsdk.addContainer(args._[0], JSON.stringify(container), function(response) {
//        console.log(response.result);
//        if (response.err) { console.log(response.err); }
//        console.log(JSON.stringify(response, null, 2));
//        quit();
//      });
//    });
//  });
//};


//var deleteContainer = function(args) {
//  nfdsdk.ioHandlers(stdoutHandler, stderrHandler);
//  nfdsdk.deleteContainer(args._[0], args._[1], function(response) {
//    console.log(response.result);
//    if (response.err) { console.log(response.err); }
//    //console.log(JSON.stringify(response, null, 2));
//    quit();
//  });
//};



var buildContainer = function(args) {
  nfdsdk.ioHandlers(curryProgressHandler('building'), stderrHandler);
  nfdsdk.buildContainer(args._[0], args._[1],function(response) {
    console.log();
    if (response) {
      console.log(response.result);
      if (response.err) { console.log(response.err); }
      //console.log(JSON.stringify(response, null, 2));
    }
    quit();
  });
};



var listRevisions = function(args) {
  nfdsdk.ioHandlers(stdoutHandler, stderrHandler);
  var table = new cliTable({chars: tableChars, style: tableStyle,
                            head: ['revision', 'deployed', 'who', 'time', 'description'],
                            //colWidths: [40, 8, 55, 25, 100]});
                            colWidths: [20, 8, 55, 25, 50]});
  nfdsdk.listRevisions(args._[0], function(revisions) {
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
  nfdsdk.ioHandlers(stdoutHandler, stderrHandler);
  nfdsdk.getRevision(args._[0], args._[1], function(revisions) {
    console.log(JSON.stringify(revisions, null, 2));
    quit();
  });
};



var listTimeline = function(args) {
  nfdsdk.ioHandlers(stdoutHandler, stderrHandler);
  var table = new cliTable({chars: tableChars,
                            style: tableStyle,
                            head: ['Timestamp', 'User', 'Action', 'Details'],
                            colWidths: [40, 20, 20, 60]});

  nfdsdk.timeline(args._[0], function(timeline) {
    _.each(timeline.entries.reverse(), function(entry){
      table.push(['' + entry.ts, entry.user.name, entry.type, entry.details]);
    });
    console.log(table.toString());
    quit();
  });
};



var deploySystem = function(args) {
  nfdsdk.ioHandlers(curryProgressHandler('deploying'), stderrHandler);
  nfdsdk.deploySystem(args._[0], args._[1], function(result) {
    if (result) {
      console.log(JSON.stringify(result, null, 2));
    }
    quit();
  });
};



var markRevisionDeployed = function(args) {
  nfdsdk.ioHandlers(stdoutHandler, stderrHandler);
  nfdsdk.markRevision(args._[0], args._[1], function(result) {
    if (result) {
      console.log(JSON.stringify(result, null, 2));
    }
    quit();
  });
};



var previewSystemDeploy = function(args) {
  nfdsdk.ioHandlers(stdoutHandler, stderrHandler);
  nfdsdk.previewSystemDeploy(args._[0], args._[1], function(operations) {
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
    quit();
  });
};



var analyzeSystem = function(args) {
  nfdsdk.analyzeSystem(args._[0], function(result) {
    if (result) {
      console.log(JSON.stringify(result, null, 2));
    }
    quit();
  });
};



var checkSystem = function(args) {
  nfdsdk.checkSystem(args._[0], function(result) {
    if (result) {
      console.log(JSON.stringify(result, null, 2));
    }
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

program.register('system list', connect.bind(null, listSystems));
program.register('system put', connect.bind(null, putSystem));
program.register('system create', connect.bind(null, createSystem));
program.register('system sync', connect.bind(null, syncSystem));
// disabled by @mcollina
//program.register('system delete', connect.bind(null, deleteSystem));
program.register('system deploy', connect.bind(null, deploySystem));
program.register('system clone', connect.bind(null, cloneSystem));
program.register('system analyze', connect.bind(null, analyzeSystem));
program.register('system check', connect.bind(null, checkSystem));
program.register('system use', useSystem);

program.register('container list', connect.bind(null, listContainers));
//program.register('container put', connect.bind(null, putContainer));
//program.register('container add', connect.bind(null, addContainer));
//program.register('container delete', connect.bind(null, deleteContainer));
program.register('container build', connect.bind(null, buildContainer));

program.register('revision list', connect.bind(null, listRevisions));
program.register('revision get', connect.bind(null, getRevision));
program.register('revision deployed', connect.bind(null, getDeployed));
program.register('revision mark', connect.bind(null, markRevisionDeployed));
program.register('revision preview', connect.bind(null, previewSystemDeploy));

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


