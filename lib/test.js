var _ = require('underscore');
var json = require('./sys.json');
var cdid = '5b15176f-0e44-4cf1-be1a-a3de756c2343';


var _ = require('underscore');
var matches = _.filter(json.topology.containers, function(container) {
  return container.containerDefinitionId === cdid;
});
_.each(matches, function(match) { match.specific.imageId = 'wank'; });

console.log(JSON.stringify(json, null, 2));
