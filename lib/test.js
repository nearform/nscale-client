/*
var _ = require('underscore');
var json = require('./sys.json');
var cdid = '5b15176f-0e44-4cf1-be1a-a3de756c2343';


var _ = require('underscore');
var matches = _.filter(json.topology.containers, function(container) {
  return container.containerDefinitionId === cdid;
});
_.each(matches, function(match) { match.specific.imageId = 'wank'; });

console.log(JSON.stringify(json, null, 2));
10.75.29.243



{
      "$rename": {
            "containers.21.contains.2": "containers.21.contains.1"
   |                },
 |          "$set": {
                "containers.20.contains.1": "40",
                "containers.21.contains.0": "50",
                        "containers.40.containedBy": "20"
                          }

*/

var _ = require('underscore');

var rd = require('rus-diff');
var s1 = require('./sys.json');
var s2 = require('./sys_move.json');

var diff = rd.diff(s1.topology, s2.topology);
console.log(JSON.stringify(diff, null, 2));

console.log(diff.$set);
_.each(_.keys(diff.$set), function(k) {
  var path = k.split('.');

  console.log(path[2]);
  if (path[0] === 'containers' && path[2] === 'containedBy') {
    var container = s2.topology.containers[path[1]];
    var containerDef = _.find(s2.containerDefinitions, function(cdef) {
        return cdef.id === container.containerDefinitionId;
      });

    //get target host
    var targetHost = s2.topology.containers[container.containedBy].specific.ipaddress;
    console.log(targetHost);
  }
});

