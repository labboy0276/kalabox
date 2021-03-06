/** Helper module for writing plugins
 * @module kbox.core.plugin
 */

'use strict';

// Constants
var PLUGIN_FILENAME = 'index.js';
var PLUGIN_DIRNAME = 'plugins';

var deps = require('./deps.js');
var fs = require('fs');
var _path = require('path');
var _util = require('../util.js');
var log = require('./log.js');

var logDebug = log.debug;

var initPlugin = function(plugin, overrides, cb) {
  deps.override(overrides, function(done) {
    try {
      deps.call(cb);
      done();
    } catch (err) {
      var context = 'Unable to load plugin [' + plugin + ']';
      throw new Error(context + ' ' + err);
    }
  });
};
exports.initPlugin = initPlugin;

var loadRawPlugin = function(pluginName, pluginDirs) {
  logDebug('PLUGINS => Loading plugin.', pluginName, pluginDirs);
  var intPluginDirs = pluginDirs.map(function(dir) {
    return _path.join(dir, PLUGIN_DIRNAME, pluginName, PLUGIN_FILENAME);
  });
  // @todo: need this to be better.
  // Add in additional directories to scan for plugins that are installed
  // externally.
  var extPluginDirs = pluginDirs.map(function(dir) {
    return _path.join(dir, 'node_modules', pluginName, PLUGIN_FILENAME);
  });
  // Check for ext first
  pluginDirs = extPluginDirs.concat(intPluginDirs);
  var path = _util.searchForPath(pluginDirs);
  if (path === null) {
    throw new Error('Plugin "' + pluginName + '" could not be loaded.');
  } else {
    return require(path);
  }
};

var pluginUsesApp = function(rawPlugin) {
  var depNames = deps.inspect(rawPlugin);
  var result = _util.helpers.find(depNames, function(depName) {
    return depName === 'app';
  });
  return (result !== null);
};
exports.pluginUsesApp = pluginUsesApp;

exports.loadIfUsesApp = function(pluginName, pluginDirs) {
  var rawPlugin = loadRawPlugin(pluginName, pluginDirs);
  if (rawPlugin === null) {
    return null;
  } else {
    var usesApp = pluginUsesApp(rawPlugin);
    if (usesApp) {
      return deps.call(function(app, appConfig) {
        var overrides = {
          app: app,
          appConfig: appConfig,
          plugin: pluginName
        };
        return initPlugin(pluginName, overrides, rawPlugin);
      });
    } else {
      return null;
    }
  }
};

var loadIfDoesNotUseApp = function(pluginName, pluginDirs) {
  var rawPlugin = loadRawPlugin(pluginName, pluginDirs);
  if (rawPlugin === null) {
    return null;
  } else {
    var usesApp = pluginUsesApp(rawPlugin);
    if (!usesApp) {
      var overrides = {
        plugin: pluginName
      };
      return initPlugin(pluginName, overrides, rawPlugin);
    } else {
      return null;
    }
  }
};
exports.loadIfDoesNotUseApp = loadIfDoesNotUseApp;

exports.load = function(pluginName, pluginDirs) {
  var rawPlugin = loadRawPlugin(pluginName, pluginDirs);
  if (rawPlugin === null) {
    return null;
  } else {
    var overrides = {
      plugin: pluginName
    };
    return initPlugin(pluginName, overrides, rawPlugin);
  }
};

exports.init = function(globalConfig) {
  var pluginDirs = [
    globalConfig.srcRoot,
    globalConfig.kalaboxRoot
  ];
  globalConfig.globalPlugins.forEach(function(pluginName) {
    // @todo: maybe store these global plugins somewhere?
    loadIfDoesNotUseApp(pluginName, pluginDirs);
  });
};
