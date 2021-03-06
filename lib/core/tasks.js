/**
 * Module for managing Kalabox tasks.
 * @module kbox.core.tasks
 */

'use strict';

var taskNode = require('./taskNode.js');
var Task = require('./task.js');

var root = null;

var init = function() {
  if (!root) {
    root = taskNode.createRoot();
  }
};
exports.init = init;

/**
 * Returns the count of registered tasks.
 * @returns {number} - The count of registered tasks.
 */
var getCount = function() {
  if (root.isLeaf()) {
    return 0;
  } else {
    var count = 0;
    this.walk(function(node, parent, depth) {
      if (node.isLeaf()) {
        count += 1;
      }
    });
    return count;
  }
};
exports.getCount = getCount;

var findNode = function(name, nodeToSearch) {
  if (!nodeToSearch) {
    nodeToSearch = root;
  }
  var result = null;
  root.walk(function(node, parent, depth) {
    if (!result && name === node.name) {
      result = node;
    }
  });
  return result;
};
exports.findNode = findNode;

var getTask = function(names, parent) {
  if (!parent) {
    parent = root;
  }
  var toResult = function(task, args) {
    return {
      task: task,
      args: args
    };
  };
  var fn = function(names, parent) {
    if (names.length === 0 || parent.isLeaf()) {
      return toResult(parent, names);
    } else {
      var node = null;
      for (var index in parent.children) {
        var child = parent.children[index];
        if (!node && child.name === names[0]) {
          node = child;
        }
      }
      if (!node) {
        return null;
      } else {
        return fn(names.slice(1), node);
      }
    }
  };
  return fn(names, parent);
};
exports.getTask = getTask;

var wrapTask = function(name, cmd) {
  var fn = function(callback) {
    var task = new Task(name, cmd);
    task.run(callback);
  };
  return fn;
};

/**
 * Registers a task that later can be run by Kalabox.
 * @arg {string<array>} names - Array of names representing a map to the task.
 * @arg {function} task - Function to run as the task.
 * @arg {function} task.next - Callback to be called when the task is complete.
 * @example
 * kbox.core.tasks.registerTask([app.name, 'name'], function(next) {
 *   console.log('app name: ' + app.name);
 *   next(); // Must be called to return control back to the Kalabox.
 * });
 */
var registerTask = function(names, task, sortIndex) {
  if (typeof names === 'string') {
    names = [names];
  }
  if (!sortIndex) {
    sortIndex = 0;
  }
  var fn = function(names, parent) {
    var name = names[0];
    if (names.length === 1) {
      parent.addChild(name, wrapTask(name, task), sortIndex);
    } else {
      var node = findNode(name, parent);
      if (!node) {
        node = parent.addChild(name, null, sortIndex);
      }
      fn(names.slice(1), node);
    }
  };
  fn(names, root);
};
exports.registerTask = registerTask;

var walk = function(node, callback) {
  if (typeof node === 'function' && !callback) {
    callback = node;
    node = root;
  }
  node.walk(callback);
};
exports.walk = walk;

var prettyPrint = function(node) {
  if (!node) {
    node = root;
  }
  var acc = ' --- Command Menu ---\n';
  var makeSpaces = function(depth) {
    var length = (depth - 1) * 4;
    return new Array(length + 1).join(' ');
  };
  node.walk(function(node, parent, depth) {
    if (depth > 0) {
      //var parentInfo = parent ? '(' + parent.name + ')' : '';
      var parentInfo = '';
      var prefix = node.task ? '' : '';
      acc += makeSpaces(depth) + prefix + node.name + parentInfo + '\n';
    }
  });
  console.log(acc);
};
exports.prettyPrint = prettyPrint;
