var fs = require('fs');
var os = require('os');
var path = require('path');
var exec = require('child_process').exec;
var async = require('async');
var uuid = require('node-uuid');
var system = require('cb-system');
var Compiler = require('nscale-compiler');

module.exports = function(dir, cb) {
  var saveCommit = function(cdef, commit, cb) {
    var systemJsonPath = path.join(dir, 'system.json');
    var system = JSON.parse(fs.readFileSync(systemJsonPath));
    var syscdef;

    for (var i = 0; i < system.containerDefinitions.length; i++) {
      syscdef = system.containerDefinitions[i];
      if (syscdef.id === cdef.id) {
        syscdef.specific.commit = commit;
        return fs.writeFile(systemJsonPath, JSON.stringify(system, null, 2), cb);
      }
    }
  };

  var fetchRepo = function(cdef, cb) {
    var repositoryUrl = cdef.specific && cdef.specific.repositoryUrl;
    if (!repositoryUrl) { return cb(); }
    // TODO: hash the origin URL and keep those repos in ~/.nscale instead
    var tmpPath = path.join(os.tmpdir(), uuid());
    system(['git', 'clone', repositoryUrl, tmpPath], function(err) {
      if (err) { return cb(err); }
      exec('git rev-parse HEAD', function(err, stdout, stderr) {
        if (err) { return cb(err); }
        var commit = stdout.toString('utf-8').trim();
        saveCommit(cdef, commit, cb);
      });
    });
  };

  var compiler = Compiler();
  compiler.compile(dir, 'local', function(err, system) {
    if (err) { return cb(err); }
    async.each(system.containerDefinitions, fetchRepo, cb);
  });
};
