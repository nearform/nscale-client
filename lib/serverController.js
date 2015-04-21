var fs = require('fs');
var async = require('async');
var portscanner = require('portscanner');
var running = require('is-running');
var exec = require('child_process').exec;
var path = require('path');
var logo = require('nearform-terminal-logo');

var nscaleRoot = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'] + '/.nscale';
var config = nscaleRoot + '/config/config.json';

module.exports = function() {

  var start = function(servers, cb) {
    var stat;

    if (fs.existsSync('/var/run/docker.sock')) {
      stat = fs.statSync('/var/run/docker.sock')
      if (process.getgroups().indexOf(stat.gid) === -1 && process.getuid() !== stat.uid) {
        console.error('unable to read and write /var/run/docker.sock, to fix run:');
        console.error('\tsudo usermod -G docker -a', username.sync());
        process.exit(1);
      }
    }

    // if config is default config then check if it exists, if not then run nscale-init before starting
    if (!fs.existsSync(config)) {
      var initProcess = exec('nscale-init');
      initProcess.on('exit', _start.bind(null, servers, cb));
    }
    else {
      _start(servers, cb);
    }
  };

  var stop = function(servers, cb) {

    function onNextServer(server, cb) {
      var pidFile = path.join(nscaleRoot, 'data', '.' + server);
      if (fs.existsSync(pidFile)) {
        var pid = Number(fs.readFileSync(pidFile));
        var cmd = 'kill ' + pid;
      }
      else { 
        cmd = 'ps aux | grep -v grep | grep -E \'' + server + '\' | awk \'{print $2}\' | xargs kill ';
      }
      exec(cmd, { stdio: 'inherit' }, function(err, data) {
        if (err) { cb(server + ' is not running'); }
        cb(null);
      });
    }

    function onComplete(err) {
      console.log('done!');
      cb(err);
    }
    
    async.eachSeries(servers, onNextServer, onComplete);
  };

  /*  
    return a status object that looks like this:
    {running: true, listening: true}
  */
  var serverStatus = function(server, cb) {
    var port = _getServerConfig(server).port || 3223;
    var result = {running: false, port: port, listening: false};
    var host = 'localhost';

    var pidFile = path.join(nscaleRoot, 'data', '.' + server);
    
    if (fs.existsSync(pidFile)) {
      var pid = Number(fs.readFileSync(pidFile));
      result.pid = pid;

      running(pid, function(err, running) {
        if (err) { cb(err); }
        result.running = running;
        portscanner.checkPortStatus(port, host, function(err, status) {
          result.listening = (status == 'open') ? true : false;
          cb(null, result);
        });
      });
    }
    else { cb(null, result); }
  }

  var _start = function(servers, cb) {
    var logDir = nscaleRoot + '/log';

    function launch(server, cb) {
      var log = logDir + '/' + server.replace('nscale-', '') + '.log';
      var cmd = 'exec ' + server + ' -c ' + config + ' > ' + log + ' 2>&1';
      var child = exec(cmd, { stdio: 'inherit' }, function(err, stdout, stderr) {
        if (err) { cb('server failed to start. run `nscale log` for more information'); }
      });
      cb(null, child);
    };

    function onNextServer(server, cb) {
      serverStatus(server, function(err, status) {
        if (err) cb(err);
        if (!(status.running || status.listening)) {
          launch(server, function(err, child) {
            if (err) { cb(err); }
            var interval = setInterval(function() {
              serverStatus(server, function(err, status) {
                if (status.running && status.listening) {
                  clearInterval(interval);
                  console.log(logo({leftPadding: 0, text: 'server successfully started'}));
                  cb(null);
                }
              });
            }, 200);
            setTimeout(function() {
              clearInterval(interval);
              cb(Error('Server is taking longer than usual to start'));
            }, 15000);
          });
        }
        else {
          console.log('server already running');
          cb(null);
        }
      });
    }

    function onComplete(err, result) {
      cb(err);
    };

    async.eachSeries(servers, onNextServer, onComplete);
  };

  var _getServerConfig = function(server) {
    key = server.replace('nscale-', '');
    return (fs.existsSync(config)) ? JSON.parse(fs.readFileSync(config))[key] : {};
  };

  return {
    start: start,
    stop: stop,
    serverStatus: serverStatus
  }
}
