# jupyter-sidecar

Little side HTML display of Jupyter kernel rich output.

![Sidecar in Electron](https://files.gitter.im/jupyter/notebook/ivzi/sidecar.gif)

## Building

This package requires node or [iojs](https://iojs.org/en/index.html), [zmq](http://zeromq.org/intro:get-the-software), and [`jupyter_console`](https://github.com/jupyter/jupyter_console).

Additionally, you'll need `node-gyp`:

```
npm install -g node-gyp
```

After cloning this repository and `cd`ing into the directory, run this:

```
$ npm install
```

## Running

Start up a console:

```
$ jupyter console
```

Fire up sidecar (from within the cloned and built directory):

```
$ npm run start
```

Sidecar will open as many display areas as there are kernels running, which means if you run

```
jupyter console
```

in separate terminals, sidecar views will pop up automagically.
