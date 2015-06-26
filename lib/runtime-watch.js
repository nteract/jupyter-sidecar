"use strict";

var watch = require('watch');
var path = require('path');

function isKernelJSON(filepath) {
  var name = path.basename(filepath);
  return name.startsWith('kernel') && name.endsWith('.json');
}

/**
 * @class RuntimeWatch
 * @classdesc Watches a Jupyter kernel runtime directory for changes, calling cb on change
 */
function RuntimeWatch(cb, directory, opts) {
  this.cb = cb;
  this.directory = directory;
  this.opts = opts || {filter: isKernelJSON, ignoreNotPermitted: true};

  watch.watchTree(this.directory, this.opts, this.runtimeDirUpdate.bind(this));
}

/**
 * Receive a runtime directory update.
 * @param {RuntimeWatch~kernelUpdateCallback} cb - Callback that handles runtimes changes (new, gone, etc.)
 */
RuntimeWatch.prototype.runtimeDirUpdate = function(f, curr, prev){
  if (typeof(f) === 'string' && isKernelJSON(f)) {
    this.cb(f, curr);
    // if curr.nlink == 0, removed
    // if prev == null, new
    // otherwise changed

  } else if (typeof(f) === 'object') {
    for (let kernelJSON of Object.keys(f) ) {
      if (isKernelJSON(kernelJSON)) {
        this.cb(kernelJSON, f[kernelJSON]);
      }
    }
  } else { // wat
    console.err(f);
  }
};

/**
 * This callback is displayed as part of the RuntimeWatch class.
 * @callback RuntimeWatch~kernelUpdateCallback
 * @param {string} full path to a kernel runtime
 * @param {fs.Stats} stats object for a kernel
 */

/**
 * echo is just an example RuntimeWatch~kernelUpdateCallback.
 * It logs a filename and the associated stat object.
 * @param {string} full path to a kernel runtime
 * @param {fs.Stats} stats object for a kernel
 */
function echo(fname, stat){
  console.log(fname);
  console.log(stat);
}

module.exports = RuntimeWatch;