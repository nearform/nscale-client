
var fs = require('fs');
var path = require('path');
var _ = require('lodash');

function currentSys() {
  var dir = process.cwd();
  var system = path.join(dir, 'system.json');
  try {
    return JSON.parse(fs.readFileSync(system)).name
  } catch(err) {
    return null
  }
}

/**
 * Fetches a system id from the filesystem is one is not provided.
 * Exist the node process if the system is missing.
 *
 */
module.exports = function fetchSys(expected, args) {
  var sys = null;

  if (args._.length >= expected) {
    return args;
  }

  sys = currentSys();

  if (!sys) {
    // TODO refactor to avoid to have a console.log here
    console.log('unable to find a valid system.json in the current directory');
    process.exit(1);
  }

  args._.unshift(sys);

  return args;
}
