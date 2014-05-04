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
/*
 * supports the following operations
 *
 * list       - list all tables in this dynamo instance
 * describe   - describe the named table
 * query      - run a query on the specified table and return the results limited to 20 elements
 *              into the node repl
 * throughput - adjust the table throughput to the given value
 */

var readline = require('readline');
var opt = require('optimist');
var argv = opt.usage('Usage: nfd.js --file <file> --cmd <command> --region region').
               alias('f', 'file').
               alias('c', 'cmd').
               alias('r', 'region').
               demand(['f']).argv;



/**
 * print help
 */
var help = function() {
  console.log("");
  console.log("list                                                - list all tables in this dynamo instance");
  console.log("describe <table name>                               - describe the named table");
  console.log("query <table name> <pkey> <range comparison> <rkey> - run a query and return the first 20 into the node repl");
  console.log("throughput <table name> <read> <write>              - set the table read and write throughput");
  console.log("exit                                                - to quit");
  console.log("");
};



/**
 * list all tables in this dynamo db instance
 */
var listTables = function(callback) {
  client.listTables({}, function (err, data) {
    if (!err) {
      console.log("Tables in region: " + awsConfig.region);
      for (idx in data.TableNames) {
        console.log("  " + data.TableNames[idx]);
      }
      callback();
    }
    else {
      console.log(err);
      callback();
    }
  });
};



/**
 * describe the table
 */
var describeTable = function(tableName, callback) {
  client.describeTable({TableName: tableName}, function(err, data) {
    if (!err) {
      console.log("Table: " + tableName + " in region " + awsConfig.region);
      console.log(data);
      callback();
    }
    else {
      console.log(err);
      callback();
    }
  });
};



/**
 * run a query against the specified table
 * parameters:
 * tableName  - the table name
 * pkey       - primary key value
 * cmp        - comparison operator one of IN, NULL, BETWEEN, LT, NOT_CONTAINS, EQ, GT, NOT_NULL, NE, LE, BEGINS_WITH, GE, CONTAINS
 * rkey       - range key value
 * callback   - callback
 *
 * e.g. 
 * query user_events 37025542720 LT 1362229748
 * repl>data.Items.length
 * 20
 */
var query = function(tableName, pkey, cmp, rkey, callback) {
  client.query({TableName: tableName,
                Limit: 20,
                Count: false,
                HashKeyValue: {N: pkey},
                RangeKeyCondition: {AttributeValueList: [{N: rkey}], ComparisonOperator: cmp}}, function(err, data) {
    if (!err) {
      var r = repl.start({prompt: "repl>", 
                          input: process.stdin,
                          output: process.stdout,
                          terminal: true}).context.data = data;
      r.on('exit', function () {
        callback();
      });
    }
    else {
      console.log(err);
      callback();
    }
  });
};



/**
 * set the table throughput
 */
var adjustTableThroughput = function(tableName, readUnits, writeUnits, callback) {
  if (readUnits && writeUnits) {
    console.log("Put the kettle on Errol, this might take a while...");
    through.adjustTableThroughput(client, tableName, readUnits, writeUnits, function(err) {
      if (err) {
        console.log("FAILED: " + err);
      }
      else {
        console.log("done!");
      }
      callback();
    });
  }
  else {
    console.log("  ERROR: you must supply both a read and write throughput!");
    callback();
  }
};



/**
 * run the nominated command
 */
var runCommand = function(rl, input, callback) {
  var params;

  if (input.indexOf("list") > -1) {
    listTables(function() {
      callback();
    });
  }
  else if (input.indexOf("describe") > -1) {
    params = input.split(" ");
    describeTable(params[1], function() {
      callback();
    });
  }
  else if (input.indexOf("throughput") > -1) {
    params = input.split(" ");
    adjustTableThroughput(params[1], params[2], params[3], function() {
      callback();
    });
  }
  else if (input.indexOf("query") > -1) {
    params = input.split(" ");
    //rl && rl.pause();
    rl && rl.close();
    query(params[1], params[2], params[3], params[4], function() {
      rl = readline.createInterface({input: process.stdin, output: process.stdout});
      //rl && rl.resume();
      callback();
    });
  }
  else if (input.indexOf("help") > -1) {
    help();
    callback();
  }
  else if (input.indexOf("exit") > -1) {
    rl && rl.close();
  }
  else {
    callback();
  }
};



/**
 * main prompt
 */
var promptForInput = function() {
  rl.question("dynamo> ", function(input) {
    runCommand(rl, input, promptForInput);
  });
};



exports.main = function() {
  if (argv.file) {
    awsConfig = AWS.config.loadFromPath(argv.file);
    if (argv.region) {
      AWS.config.update({region: argv.region});
    }
    dynDb = new AWS.DynamoDB(awsConfig);
    client = dynDb.client;

    console.log("");
    console.log("connected to region: " + awsConfig.region);

    if (argv.cmd) {
      runCommand(null, argv.cmd, function() {});
    }
    else {
      rl = readline.createInterface({input: process.stdin, output: process.stdout});
      promptForInput();
    }
  }
  else {
    opt.usage();
  }
};

















/*
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
/*
 * nfd command line client
 *
 * use:
 * nfd <command> <target> 
 *
 * supported use cases
 *
 * nfd list systems                 list all systems managed by this instance
 *
 * nfd list containers <systemid>   list all conainers avilable under this system
 *
 */

'use strict';

var opts = require('yargs').argv;
var assert = require('assert');
var nfdsdk = require('../nfd-sdk/main');



var validateArgs = function(type, id) {
  var result = type === 'systems' || type === 'containers';
  if (type === 'containers') {
    result = undefined !== id;
  }
  assert(result);
};



var list = function(type, id) {
  validateArgs(type, id);

  switch(type) {
    case 'systems':
      nfdsdk.listSystems(function(systems) {
        console.log(JSON.stringify(systems, null, 2));
      });
      break;
    case '':
      nfdsdk.listContainers(id, function(containers) {
        console.log(JSON.stringify(containers, null, 2));
      });
      break;
    default:
      assert(false);
      break;
  }
};



var build = function() {
};



var exec = {list: list, build: build};
exec[opts._[1]](opts._);

