/**
 * Small convenience class for easily connecting to a Rubjoy Bluetooth LE device from a browser
 * using the [Web Bluetooth API]{@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API}.
 *
 * Converts TCode into messages The Rubjoy can understand.
 */
export default class RubjoyBLEDevice {
  static SERVICE_UUID = '0000dfb0-0000-1000-8000-00805f9b34fb';

  static CHARACTERISTIC_UUID = '0000dfb1-0000-1000-8000-00805f9b34fb';

  static DEVICE_NAME = 'Bluno';

  connected = false;

  _bluetooth = null;

  _encoder = new TextEncoder();

  _strokePosition = 0.5;

  _rollPosition = 0.5;

  /**
   * Create a new RubjoyBLEDevice.
   *
   * @example
   * const device = new RubjoyBLEDevice();
   *
   * @param {Function} positionProvider - a function that provides the current position of the device
   * @param {Bluetooth} [bluetooth=navigator.bluetooth] - Web Bluetooth API interface.
   */
  constructor (positionProvider, bluetooth = null) {
    this._bluetooth = bluetooth || (globalThis.navigator ? globalThis.navigator.bluetooth : null);
    this._positionProvider = positionProvider;
  }

  /**
   * Opens a request to connect to a Rubjoy.
   *
   * @example
   * const device = new RubjoyBLEDevice();
   * device.requestConnection().then(() => {
   *   // ...
   * });
   *
   * @returns {Promise} a promise that resolves when the device is connected, and rejects if the device failed to connect.
   */
  async requestConnection () {
    const device = await this._bluetooth.requestDevice({
      filters: [{
        services: [RubjoyBLEDevice.SERVICE_UUID],
      }],
    });

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(RubjoyBLEDevice.SERVICE_UUID);
    const commandCharacteristic = await service.getCharacteristic(RubjoyBLEDevice.CHARACTERISTIC_UUID);

    this.connected = true;

    const disconnectListener = () => {
      this.connected = false;

      this._device?.removeEventListener('disconnect', disconnectListener);
      this._reset();
    };

    device.addEventListener('gattserverdisconnected', disconnectListener);

    this._characteristic = commandCharacteristic;
    this._device = device;
    this._strokePosition = 0.5;
    this._rollPosition = 0.5;

    // Set Ease Delay to zero so device is faster.
    await this._sendCommand('ED 0');

    // Set the device to the center position.
    await this._sendCommand('P 1000 1000');
  }

  async disconnect () {
    this.connected = false;
    this._device.gatt.disconnect();
  }

  /**
   * write() method called by Ayva.js.
   *
   * This parses the TCode sends the position to the device.
   *
   * @param {String} output - tcode string to send to the device.
   */
  write (output) {
    if (this.connected) {
      // Capture position of the stroke axis (L0)
      const strokeAxisDecoded = output.match(/L0([0-9]+)/);
      const rollAxisDecoded = output.match(/R1([0-9]+)/);

      if (strokeAxisDecoded || rollAxisDecoded) {
        this._strokePosition = strokeAxisDecoded ? Number(`0.${strokeAxisDecoded[1]}`) : this._strokePosition;
        this._rollPosition = rollAxisDecoded ? Number(`0.${rollAxisDecoded[1]}`) : this._rollPosition;

        const rubjoyPosition = Math.round((1 - this._strokePosition) * 1200) + 400;
        const rubjoyRoll = Math.round(200 * (this._rollPosition * 2 - 1));
        const rubjoyLeft = rubjoyPosition - rubjoyRoll;
        const rubjoyRight = rubjoyPosition + rubjoyRoll;
        this._sendCommand(`P ${rubjoyLeft} ${rubjoyRight}`);
      }
    } else {
      throw new Error('No device connected.');
    }
  }

  _sendCommand (text) {
    const command = `${text}\r\n`;
    return this._characteristic.writeValueWithoutResponse(this._encoder.encode(command)).catch(() => {
      /* Ignore GATT operation already in progress errors. */
    });
  }

  _reset () {
    this._device = null;
    this._characteristic = null;
  }
}
