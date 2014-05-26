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
var _ = require('underscore');
var cliTable = require('cli-table');
var nfdsdk = require('../../nfd-sdk/main')();
process.stdin.setEncoding('utf8');



var showHelp = function(args, cb) {
  console.log('');
  console.log('list systems                                      - list all systems in this instance');
  console.log('get system                                        - get the head revision of this system');
  console.log('put system                                        - put a new revision of the system');
  console.log('create system <name> <namespace>                  - create a new blank system');
  console.log('delete system <systemid>                          - delete a system');
  console.log('list revisions <systemid>                         - list revision history for this system');
  console.log('get revision <systemid> <revisionid>              - get a specific revision for a system');
  console.log('list containers <systemid>                        - list all containers in this system');
  console.log('build container <systemid> <containerid>          - build a specific container');
  console.log('deploy system <systemid> <revisionid>             - deploy a specific revision of this system');
  console.log('list timeline <systemid>                          - list the timeline for this system');
  console.log('help                                              - show this');
  console.log('');
  cb();
};



var listSystems = function(args, cb) {
  nfdsdk.listSystems(function(systems) {
    console.log(JSON.stringify(systems, null, 2));
    cb();
  });
};



var listContainers = function(args, cb) {
  nfdsdk.listContainers(args[2], function(containers) {
    console.log(JSON.stringify(containers, null, 2));
    cb();
  });
};



var getSystem = function(args, cb) {
  nfdsdk.getSystem(args[2], function(system) {
    console.log(JSON.stringify(system, null, 2));
    cb();
  });
};



var createSystem = function(args, cb) {
  nfdsdk.createSystem(args[2], args[3], function(system) {
    console.log(JSON.stringify(system, null, 2));
    cb();
  });
};



var deleteSystem = function(args, cb) {
  nfdsdk.deleteSystem(args[2], function(result) {
    console.log(JSON.stringify(result, null, 2));
    cb();
  });
};



var putSystem = function(args, cb) {
  var sys = '';
  process.stdin.on('readable', function() {
    sys += process.stdin.read();
  });

  process.stdin.on('end', function() {
    nfdsdk.putSystem(sys, function(system) {
      console.log(JSON.stringify(system, null, 2));
      cb();
    });
  });
};



var buildContainer = function(args, cb) {
  nfdsdk.buildContainer(args[2], args[3], function(result) {
    if (result) {
      console.log(JSON.stringify(result, null, 2));
    }
    cb();
  });
};



var listRevisions = function(args, cb) {
  var table = new cliTable({chars: { 'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': '',
                                     'bottom': '' , 'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': '',
                                     'left': '' , 'left-mid': '' , 'mid': '' , 'mid-mid': '',
                                     'right': '' , 'right-mid': '' , 'middle': ' ' },
                            style: { 'padding-left': 0, 'padding-right': 0 },
                            head: ['Revision', 'deployed', 'description'], colWidths: [50, 10, 100]});
  nfdsdk.listRevisions(args[2], function(revisions) {
    _.each(revisions, function(revision) {
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



var listTimeline = function(systemId, containerId, user, cb) {
  nfdsdk.timeline(systemId, containerId, user, function(result) {
    console.log(JSON.stringify(result, null, 2));
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



var map = {list: {systems: listSystems,
                  containers: listContainers,
                  revisions: listRevisions,
                  timeline: listTimeline},
           get: {system: getSystem,
                 revision: getRevision},
           put: {system: putSystem},
           create: {system: createSystem},
           add: {timeline: addToTimeline},
           delete: {system: deleteSystem},
           build: {container: buildContainer},
           deploy: {system: deploySystem},
           help: showHelp};



var runCommand = function(cmd, cb) {
  if (map[cmd[0]] && _.isFunction(map[cmd[0]])) {
    map[cmd[0]](cmd, function() {
      cb();
    });
  }

  if (map[cmd[0]] && map[cmd[0]][cmd[1]] && _.isFunction(map[cmd[0]][cmd[1]])) {
    map[cmd[0]][cmd[1]](cmd, function() {
      cb();
    });
  }
};



var stdoutHandler = function(out) {
  console.log(out.responseType + ':' + out.level + ': ' + out.stdout);
};



var stderrHandler = function(err) {
  console.log(err.responseType + ':' + err.level + ': ' + err.stderr);
};



exports.main = function() {
  if (!argv.host) {
    argv.host = 'localhost';
  }
  if (!argv.port) {
    argv.port = 3223;
  }

  nfdsdk.connect({hostname: argv.host, port: argv.port}, function() {
    nfdsdk.ioHandlers(stdoutHandler, stderrHandler);
    runCommand(argv._, function() {
      nfdsdk.quit(function() {
        process.exit(0);
      });
    });
  });
};


