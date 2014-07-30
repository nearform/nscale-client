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

var blessed = require('blessed');
var _ = require('lodash');

var templates = {docker: {'name': '',
                          'type': 'docker',
                          'specific': {
                            'repositoryUrl': 'git@github.com:',
                            'buildScript': '',
                            'arguments': '',
                            'buildHead': 0,
                            'binary': ''
                          },
                          'version': '0.1.0',
                          'id': '222409de-150d-42fb-8151-da6b08fa7ce7'}};



var refresh = function(flat) {
  var index = 0;
  _.each(flat.display, function() {
    flat.display[index] = flat.names[index] + ': ' + flat.values[index];
    ++index;
  });
};



var editValue = function(blessed, screen, list, flat, index, cb) {
  var outer = blessed.box({
    fg: 'black',
    border: {
      type: 'line',
      fg: '#ffffff'
    },
    tags: true,
    width: '50%',
    height: '20%',
    top: '5',
    left: '5'
  });
  outer.prepend(new blessed.Text({left: 2, content: '<esc>|<Ctrl>-save'}))

  var edit = blessed.Textbox({  
    fg: 'black',
    tags: true,
    value: '' + flat.values[index],
    width: '90%',
    height: '80%',
    top: '100',
    left: '20'
  });

  outer.append(edit);
  screen.append(outer);
  edit.focus();
  screen.render();
  edit.readInput();

  edit.key('escape', function() {
    outer.remove(edit);
    screen.remove(outer);
    list.focus();
    screen.render();
  });

  edit.key('C-s', function() {
    flat.values[index] = edit.getValue();
    refresh(flat);
    outer.remove(edit);
    screen.remove(outer);
    list.focus();
    cb(flat);
  });
};



var cdefToList = function(cdef) {
  var edit = {display: [],
              names: [],
              values: []};
  edit.display.push('name: ' + cdef.name);
  edit.display.push('type: ' + cdef.type);
  edit.names.push('name');
  edit.names.push('type');
  edit.values.push(cdef.name);
  edit.values.push(cdef.type);

  console.log(cdef.specific);
  _.each(_.keys(cdef.specific), function(key) {
    edit.display.push(key + ': ' + cdef.specific[key]);
    edit.names.push(key);
    edit.values.push(cdef.specific[key]);
  });
  return edit;
};



var listToCDef = function(flat, cdef) {
  var index = 2;
  cdef.name = flat.values[0];
  cdef.type = flat.values[1];
  _.each(_.keys(cdef.specific), function(key) {
    cdef.specific[key] = flat.values[index];
    ++index;
  });
  return cdef;
};



var edit = function(cdef, cb) {
  var construct = function() {
    var program = blessed();
    var screen = blessed.screen();
    var list = blessed.list({  
        parent: screen,
          width: '100%',
          height: '100%',
          top: 'center',
          left: 'left',
          align: 'left',
          fg: 'black',
          border: {
            type: 'line'
        },
        selectedBg: 'black',
        selectedFg: 'white',
        mouse: true,
        label: 'Container Editor <esc> cancel | <Ctrl>-s save ',
        keys: true,
        vi: true
    });
    var flat = cdefToList(cdef);

    list.setItems(flat.display);
    list.select(0);

    list.on('select', function(context, index) { 
      editValue(blessed, screen, list, flat, index, function() {
        list.clearItems();
        list.setItems(flat.display);
        list.select(index);
        screen.render();
      });
    });

    screen.key('escape', function() {
      screen.remove(list);
      screen.render();
      program.disableMouse();
      program.showCursor();
      program.normalBuffer();
      setTimeout(function() { cb(cdef); }, 100);
    });

    screen.key('C-s', function() {
      screen.remove(list);
      screen.render();
      program.disableMouse();
      program.showCursor();
      program.normalBuffer();
      cdef = listToCDef(flat, cdef);
      setTimeout(function() { cb(cdef); }, 100);
    });

    screen.render();  
  };



  construct();
};



exports.edit = function(cdef, cb) {
  edit(cdef, cb);
};



exports.create = function(type, cb) {
  edit(_.cloneDeep(templates[type]), cb);
};


/*
exports.create('docker', function(newCDef) {
  console.log(newCDef);
  process.exit(0);
});
*/



