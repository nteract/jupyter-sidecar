"use strict";

module.exports = {
  Session: Session
};

var jmp = require("jmp");
var zmq = require("zmq");
var crypto = require("crypto");
var uuid = require("node-uuid");

function formConnectionString(config, channel) {
  var portDelimiter = ":";
  if (config.transport !== "tcp") {
    portDelimiter = "-";
  }

  return config.transport + "://" + config.ip + portDelimiter + config[channel + "_port"];
}

/**
 * This callback handles jmp.Messages
 * @callback messageCallback
 * @param {jmp.Message} message
 */

/**
 * @class Session
 * @classdesc Keeps a session with an IOPub channel
 * @param {Object} connectionJSON Connection information provided by Jupyter
 */
function Session(connectionJSON) {
  	/**
     * Connection information provided by Jupyter
     * @member {Object}
     */
    this.connectionJSON = connectionJSON;

    var
      scheme = this.connectionJSON.signature_scheme.slice("hmac-".length),
      key = this.connectionJSON.key;

    /**
     * Jupyter IOPub channel
     * @member {module:jmp~Socket}
     */
    this.iopubSocket = new jmp.Socket("sub", scheme, key);

    /**
     * URL for zmq socket
     * @member {string}
     */
    this.iopubURL = formConnectionString(this.connectionJSON, "iopub");

    this.iopubSocket.connect(this.iopubURL);
    this.iopubSocket.subscribe('');

    this.heartbeatSocket = new zmq.Socket("req");
    this.heartbeatURL = formConnectionString(this.connectionJSON, "hb");
    this.heartbeatSocket.connect(this.heartbeatURL);

    this.shellSocket = new zmq.Socket("dealer", scheme, key);
    this.shellURL = formConnectionString(this.connectionJSON, "shell");
    this.shellSocket.connect(this.shellURL);


    var messageType = 'kernel_info_request';

    var content = JSON.stringify({});
    var header = JSON.stringify({
      msg_id: uuid.v4(),
      username: "omgseriously",
      session: 0,
      msg_type: messageType,
      version: "5.0"
    });

    var parentHeader = JSON.stringify({});
    var metadata = JSON.stringify({});

    console.log(scheme);

    var signature = '';
    if (key !== '' ){
      var hmac = crypto.createHmac(scheme, key);
          hmac.update(header);
          hmac.update(parentHeader);
          hmac.update(metadata);
          hmac.update(content);
          signature = hmac.digest("hex");
    }

    var message = [
      '<IDS|MSG>',
      signature,
      header,
      parentHeader,
      metadata,
      content
    ];
    console.log(message);

    var m = new jmp.Message(message, scheme, key);

    this.shellSocket.on("message", function(message){
      console.log(message.toString());
    });

    this.shellSocket.send(message);
    //this.shellSocket.send(m);


}

/**
 * Test the kernel's heartbeat to verify that it is (still) alive.
 * @param {healthCallback} cb - Callback to invoke with the health of the kernel.
 */
Session.prototype.checkHealth = function (cb) {
  const payload = "simple bytestrings, not full JSON messages described above";
  let giveUp = null;

  this.heartbeatSocket.once("message", function (reply) {
    if (reply.toString() === payload) {
      cb(true);
    } else {
      console.error(`Error: unexpected payload <${reply}>`);
    }
  });

  this.heartbeatSocket.send(payload);
};

/**
 * This callback reports whether or not a kernel is alive.
 * @callback healthCallback
 * @param {bool} True if the kernel has responded, false if it has not.
 */
