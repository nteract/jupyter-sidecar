"use strict";

var app = require('app');  // Electron app
var BrowserWindow = require('browser-window');  // Creating Browser Windows

var globalShortcut = require('global-shortcut');

var jupyter = require("./lib/jupyter.js");
var RuntimeWatch = require("./lib/runtime-watch.js");

var jp = require('jupyter-paths');

// Report crashes to our server.
require('crash-reporter').start();

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  // Fully close up, even on OS X
  app.quit();
});

function launchSideCar(session) {
  // Keep a global reference of the side car window object
  // If we don't, the window will be closed automatically when the javascript
  // object is GCed.
  var sideCar = null;

  // Create the browser window.
  sideCar = new BrowserWindow({
    width: 800,
    height: 800,
    //"node-integration": false, // Would have to use a web-view and work with events
    frame: false
  });

  // and load the index.html of the app.
  sideCar.loadUrl('file://' + __dirname + '/index.html');

  sideCar.webContents.on('did-finish-load', function () {
    session.iopubSocket.on("message", function (message) {
      sideCar.webContents.send("message", message);
    });
  });

  // Emitted when the window is closed.
  sideCar.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    sideCar = null;
  });

  return sideCar;
}

let liveSidecars = new Map();

function updateKernel(connFiles) {
  for (let i = 0; i < connFiles.length; i++) {
    let
      connPath = connFiles[i].path,
      connStat = connFiles[i].stat;

    if (connStat.nlink !== 0) {
      // This connection file is still present. Create a connection and probe its heartbeat to
      // verify that the kernel is still responsive.
      let config = require(connPath);
      let session = new jupyter.Session(config);

      session.checkHealth(makeHeartbeatHandler(connPath, session));
    } else {
      handleDeadKernel(connPath);
    }
  }
}

/**
 * Callback to be executed with the result of a specific kernel's heartbeat.
 * @callback heartbeatHandler
 * @param alive {bool} True if the kernel responded to a probe, false if it timed out.
 */

/**
 * Ensure that the sidecar corresponding to a connection file is alive or dead depending on the
 * response from the session's heartbeat.
 *
 * @param connPath {string} the filesystem path to the connection JSON file.
 * @param session {jupyter.Session} an opened session to this kernel.
 */
function makeHeartbeatHandler(connPath, session) {
  return function (alive) {
    console.log("Kernel " + connPath + " responded to a heartbeat with: " + alive);
    if (alive) {
      handleLiveKernel(connPath, session);
    } else {
      handleDeadKernel(connPath);
    }
  };
}

/**
 * A kernel at the given connection path is alive and responding to heartbeat messages. Launch a
 * new sidecar window if it does exist already.
 *
 * @param connPath {string} the filesystem path to the connection JSON file.
 * @param session {jupyter.Session} an opened session to this kernel.
 */
function handleLiveKernel(connPath, session) {
  if (! liveSidecars.has(connPath)) {
    console.log("Launching sidecar for connection " + connPath + ".");
    liveSidecars.set(connPath, launchSideCar(session));
  }
}

/**
 * A kernel connection JSON file has been deleted from the filesystem, or the kernel that a JSON
 * file is referencing no longer responds to a heartbeat. Locate the sidecar window corresponding
 * to this kernel and shut it down.
 *
 * @param connPath {string} the filesystem path to the connection JSON file.
 */
function handleDeadKernel(connPath) {
  console.log("Connection " + connPath + " is no longer present.");

  if (liveSidecars.has(connPath)) {
    console.log("Closing the corresponding sidecar.");
    liveSidecars.get(connPath).close();
    liveSidecars.delete(connPath);
  }
}

var kw = new RuntimeWatch(updateKernel, jp.paths.runtime[0]);

// This method will be called when Electron has done every
// initialization and is ready for creating browser windows.
app.on('ready', function() {
		globalShortcut.register('Alt+CmdOrCtrl+I', function () {
			var win = BrowserWindow.getFocusedWindow();

			if (win) {
				win.toggleDevTools();
			}
		});

		globalShortcut.register('CmdOrCtrl+R', function () {
			var win = BrowserWindow.getFocusedWindow();

			if (win) {
				win.reloadIgnoringCache();
			}
		});
});
