/**
 * Small convenience class for easily connecting to a local web socket.
 */
class WebSocketDevice {
  connected = false;

  _host = null;

  _port = null;

  _socket = null;

  constructor (host, port, errorHandler = () => {}) {
    this._host = host;
    this._port = port;
    this._errorHandler = errorHandler;
  }

  async requestConnection () {
    let resolved = false;

    return new Promise((resolve, reject) => {
      const socket = new WebSocket(`ws://${this._host}:${this._port}`);

      socket.onopen = () => {
        resolve();
        resolved = true;
        this.connected = true;
      };

      socket.onclose = () => {
        this.connected = false;
      };

      socket.onerror = () => {
        this._errorHandler();
        this.connected = false;

        if (!resolved) {
          reject(new Error(`Unable to establish connection to host ${this._host} on port ${this._port}.`));
        }
      };

      this._socket = socket;
    });
  }

  async disconnect () {
    this._socket.close();
  }

  write (output) {
    if (this.connected) {
      this._socket.send(output);
    } else {
      throw new Error('No device connected.');
    }
  }
}

export default WebSocketDevice;
