var os = require('os');
var path = require('path');
var async = require('async');
var uuid = require('node-uuid');
var system = require('cb-system');
var Compiler = require('nscale-compiler');

module.exports = function(dir, cb) {
  var saveCommit = function(cdef, sha, cb) {
  }

  var fetchRepo = function(cdef, cb) {
    var repositoryUrl = cdef.specific && cdef.specific.repositoryUrl;
    console.log(repositoryUrl);
    if (!repositoryUrl) { return; }
    // TODO: hash the origin URL and keep those repos in ~/.nscale instead
    var tmpPath = path.join(os.tmpdir(), uuid());
    system(['git', 'clone', repositoryUrl, tmpPath], function (err) {
      if (err) { return cb(err); }
    });
  }

  var compiler = Compiler();
  compiler.compile(dir, 'local', function(err, system) {
    if (err) { return cb(err); }
    async.each(system.containerDefinitions, fetchRepo, cb);
  });
};
