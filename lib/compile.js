var fs = require('fs');
var os = require('os');
var path = require('path');
var exec = require('child_process').exec;
var async = require('async');
var system = require('cb-system');
var rimraf = require('rimraf');
var Compiler = require('nscale-compiler');

module.exports = function(dir, cb) {
  var cloneOrFetch = function(cdef, cb) {
    var repoPath = path.join(dir, 'workspace', cdef.id);
    var repositoryUrl = cdef.specific.repositoryUrl;

    var clone = function() {
      // rimraf will return successfully even if `repoPath` doesn't exist.
      console.log('cloning ' + repositoryUrl);
      system(['git', 'clone', repositoryUrl, repoPath], function(err) {
        if (err) { return cb(err); }
        cb(null, repoPath);
      });
    };

    // First, check if repository path exists.
    if (fs.existsSync(repoPath)) {
      // If it does, check if it has a .git directory.
      if (fs.existsSync(path.join(repoPath, '.git'))) {
        // If it does, run a git pull in the repository path.
        console.log('fetching');

        // Set the remote URL in case user changed the repository URL in
        // system.js.
        system(['git', 'remote', 'set-url', 'origin', repositoryUrl], { cwd: repoPath }, function(err) {
          if (err) { return cb(err); }

          system(['git', 'fetch', 'origin', '-v'], { cwd: repoPath }, function(err) {
            if (err) {
              // If it doesn't work, bail out.
              // There are so many reasons for which `git fetch` might fail
              // because repositories somehow winded up in weird state. Trying
              // to detect each one of them is hard, so just bail out.
              return cb(err);
            }
            // If it worked call the callback.
            cb(null, repoPath);
          });
        });
      }
      else {
        // If .git in the repository path doesn't exist, remove the whole
        // repository and clone it again. Not worth trying to recover or clean
        // the directory.
        rimraf.sync(repoPath);
        clone();
      }
    }
    else {
      // If the repository path doesn't exist, clone the repo there.
      clone();
    }
  };

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
    cloneOrFetch(cdef, function(err, repoPath) {
      if (err) { return cb(err); }
      exec(
        'git rev-parse origin/' + (cdef.specific.branch || 'master'),
        { cwd: repoPath },
        function(err, stdout, stderr) {
          if (err) { return cb(err); }
          var commit = stdout.toString('utf-8').trim();
          console.log(cdef.id + ' is at ' + commit);
          saveCommit(cdef, commit, cb);
        }
      );
    });
  };

  var compiler = Compiler();
  compiler.compile(dir, 'local', function(err, system) {
    if (err) { return cb(err); }
    async.each(system.containerDefinitions, fetchRepo, cb);
  });
};
