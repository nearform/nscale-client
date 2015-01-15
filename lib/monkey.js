

var fs = require('fs');
var path = require('path');
var monkey = fs.readFileSync(path.join(__dirname, 'monkey.txt'), 'utf8');

module.exports = monkey;

if (require.main === module) {
  console.log(monkey);
}
