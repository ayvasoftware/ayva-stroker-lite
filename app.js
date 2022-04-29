import { html } from '../util.js';
import AyvaLimits from './components/limits.js';
import AyvaFreePlay from './components/free-play.js';
import AyvaMode from './components/mode.js';
import AyvaConnected from './components/connected.js';
import AyvaController from './controller.js';
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.16/+esm';
import Slider from '../lib/nouislider.min.mjs';
import OSREmulator from 'https://unpkg.com/osr-emu';
import Ayva, { WebSerialDevice, TempestStroke } from 'https://unpkg.com/ayvajs';
import { formatter } from './util.js';

// These need to be "globals" so they aren't proxied by Vue... because issues with private members :(
const ayva = new Ayva().defaultConfiguration();
const device = new WebSerialDevice();
let controller;
let emulator;

export default {
  template: html`
    <ayva-limits @update-limits="updateLimits"/>
    <ayva-free-play 
      @update-parameters="updateParameters" 
      @update-strokes="updateStrokes"
      @select-stroke="selectStroke"
      :current-stroke-name="currentStrokeName"/>
    <ayva-mode :mode="mode"/>

    <div id="main" class="lil-gui">
      <div id="emulator" ref="emulator"></div>

      <div id="connected"><ayva-connected :connected="connected"/></div>

      <button id="connect" @click="requestConnection" :disabled="connected">
        Connect Device
      </button>

      <button id="start-free-play" @click="freePlay()" :disabled="mode === 'Free Play' || !strokes.length">
        Free Play
      </button>

      <button id="home" @click="home()">
        Home
      </button>

      <button id="stop" @click="stop" :disabled="mode === 'Stopped'">
        Stop (Esc)
      </button>

      <div id="current-bpm">
        <div class="slider" ref="bpmSlider"></div>
        <div class="label">
          <span>Current BPM</span>
        </div>
      </div>
    </div>
  `,

  data () {
    return {
      stopped: true,
      connected: false,
      disconnectInterval: null,
      mode: 'Stopped',
      strokes: [],
      parameters: {},
      bpmActive: false,
      currentBpm: 60,
      currentStrokeName: 'None',
    }
  },

  props: [],

  components: {
    AyvaLimits,
    AyvaFreePlay,
    AyvaMode,
    AyvaConnected,
  },

  methods: {
    updateLimits (axis) {
      ayva.updateLimits(axis.name, axis.limits.min, axis.limits.max);
    },

    updateParameters (parameter) {
      this.parameters[parameter.name] = parameter.value;
    },

    updateStrokes (strokes) {
      this.strokes = strokes;
    },

    updateController () {
      if (controller) {
        controller.strokes = this.strokes;
        controller.parameters = this.parameters;
        controller.bpmActive = this.bpmActive;
      }
    },

    selectStroke (stroke) {
      this.startController();
      controller.strokeCommand = stroke;
      this.mode = 'Manual';
    },

    freePlay () {
      this.startController();
      controller.random = true;
      this.mode = 'Free Play';
    },

    startController () {
      if (!controller) {
        controller = new AyvaController();
        this.updateController();
        ayva.do(controller);
      }
    },

    home () {
      this.stop();
      ayva.home();
    },

    stop () {
      ayva.stop();
      controller = null;
      this.mode = 'Stopped';
    },

    requestConnection() {
      device.requestConnection().then(() => {
        ayva.addOutputDevice(device);
        this.connected = true;

        // TODO: Use the disconnect listener instead of polling once WebSerialDevice is updated to support it.
        this.disconnectInterval = setInterval(() => {
          if (!device.connected) {
            clearInterval(this.disconnectInterval);
            this.connected = false;
            ayva.removeOutputDevice(device);
          }
        }, 1000);
      }).catch((error) => { 
        /* Do nothing if no port was selected. */ 
        console.warn(error);
      });
    }
  },

  mounted () {
    new GUI().hide(); // Hacky way to inject styles from lil-gui.

    emulator = new OSREmulator(this.$refs.emulator);

    ayva.addOutputDevice(emulator);

    Slider.create(this.$refs.bpmSlider, {
      start: [60],
      tooltips: true,
      connect: true,
      padding: [10],
      step: 1,
      range: {
        min: 0,
        max: 120,
      },
      format: formatter(),
    });

    this.$refs.bpmSlider.noUiSlider.on('start', () => {
      this.bpmActive = true;
    });

    this.$refs.bpmSlider.noUiSlider.on('end', () => {
      this.bpmActive = false;
    });

    this.$refs.bpmSlider.noUiSlider.on('update', ([bpm]) => {
      this.currentBpm = bpm;
    });

    const watchProperties = [
      'bpmActive',
      'currentBpm',
      'strokes',
      'parameters'
    ];
    
    watchProperties.forEach((prop) => this.$watch(prop, () => this.updateController(), { immediate: true, deep: true }));

    window.addEventListener('keyup', (event) => {
      if (event.key === 'Escape') {
        this.stop();
      }
    });
  }
};