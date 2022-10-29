<template>
  <ayva-limits :style="hudStyle" @update-limits="updateLimits" />

  <ayva-free-play
    :mode="mode"
    :current-stroke-name="currentStrokeName"
    :style="hudStyle"
    @update-parameters="updateParameters"
    @update-strokes="updateStrokes"
    @select-stroke="selectStroke"
  />

  <ayva-mode :mode="mode" />

  <div
    id="main"
    class="lil-gui"
  >
    <div
      id="emulator"
      ref="emulator"
    />

    <ayva-connected
      :connected="device.connected"
      :mode="mode"
      :style="hudStyle"
      @request-connection="requestConnection"
    />

    <div class="actions">
      <div class="hud-button" @click="showHud = !showHud">
        <hud-on-icon v-show="showHud" />
        <hud-off-icon v-show="!showHud" />
      </div>

      <button
        id="home"
        @click="home()"
      >
        Home Device
      </button>

      <button
        id="start-free-play"
        :disabled="mode === 'Free Play' || !strokes.length"
        @click="freePlay()"
      >
        Free Play
      </button>

      <button
        id="stop"
        :disabled="mode === 'Stopped'"
        @click="onStop"
      >
        Stop (Esc)
      </button>
    </div>

    <div id="current-bpm" :style="hudStyle">
      <div class="faux-bpm-track" />

      <ayva-slider
        ref="bpmSlider"
        :options="bpmSliderOptions"
        :disabled="bpmDisabled ? '' : null"
        @update="currentBpm = $event"
        @start="bpmSliderActive = true"
        @end="bpmSliderActive = false"
        @change="onChange"
      />
      <div
        class="label"
        :disabled="bpmDisabled ? '' : null"
      >
        <span>Current BPM</span>
      </div>
    </div>

    <n-modal :show="showReleaseNotes" :auto-focus="false">
      <div>
        <div class="lil-gui">
          <ayva-release-notes ref="strokeEditor" @close="showReleaseNotes = false" />
        </div>
      </div>
    </n-modal>

    <div class="logo" :style="hudStyle">
      Powered By <a
        class="ayva"
        href="https://ayvajs.github.io/ayvajs-docs"
        target="_blank"
      >Ayva</a>
    </div>
  </div>
</template>

<script>
import OSREmulator from 'osr-emu';
import { Ayva, WebSerialDevice } from 'ayvajs';
import { computed } from 'vue';
import { useNotification } from 'naive-ui';
import { createAyva } from './lib/ayva-config.js';
import AyvaSlider from './components/widgets/AyvaSlider.vue';
import AyvaLimits from './components/AyvaLimits.vue';
import AyvaFreePlay from './components/AyvaFreePlay.vue';
import AyvaMode from './components/AyvaMode.vue';
import AyvaConnected from './components/AyvaConnected.vue';
import AyvaController from './lib/controller.js';
import AyvaReleaseNotes from './components/AyvaReleaseNotes.vue';
import { formatter } from './lib/util.js';
import CustomBehaviorStorage from './lib/custom-behavior-storage';

// These need to be "globals" so they aren't proxied by Vue... because issues with private members :(
const ayva = createAyva();

let controller;
let emulator;

export default {

  components: {
    AyvaLimits,
    AyvaFreePlay,
    AyvaMode,
    AyvaConnected,
    AyvaSlider,
    AyvaReleaseNotes,
  },

  provide () {
    return {
      globalAyva: ayva,
      globalDevice: computed(() => this.device),
      globalParameters: computed(() => this.parameters),
    };
  },

  props: [],

  setup () {
    const notification = useNotification();
    return {
      notify: notification,
    };
  },

  data () {
    return {
      stopped: true,
      disconnectInterval: null,
      mode: 'Stopped',
      strokes: [],
      parameters: {},
      bpmSliderActive: false,
      currentBpm: 60,
      currentStrokeName: 'None',
      bpmDisabled: false,
      bpmAnimationFrame: null,

      bpmSliderOptions: {
        start: [60],
        tooltips: true,
        behaviour: 'snap',
        connect: true,
        padding: [10],
        step: 1,
        range: {
          min: 0,
          max: 150,
        },
        format: formatter(),
      },

      device: new WebSerialDevice(),

      showHud: true,

      showReleaseNotes: true,
    };
  },

  computed: {
    hudStyle () {
      return this.showHud ? '' : 'visibility: hidden !important';
    },
  },

  watch: {
    'device.connected' (connected) {
      if (connected) {
        for (const axis in ayva.$) { // eslint-disable-line guard-for-in
          // Insta home....
          ayva.$[axis].value = ayva.$[axis].defaultValue;
        }
      } else {
        ayva.removeOutput(this.device);
        ayva.stop();
      }
    },
  },

  beforeCreate () {
    new CustomBehaviorStorage().migrateLegacyStrokes(); // TODO: Remove this in a future release.

    const ayvaStop = ayva.stop.bind(ayva);

    ayva.stop = () => {
      // TODO: Remove this once Ayva supports on stop events.
      ayvaStop();
      this.onAyvaStop();
    };
  },

  mounted () {
    emulator = new OSREmulator(this.$refs.emulator);

    ayva.addOutput(emulator);

    const watchProperties = [
      'bpmSliderActive',
      'currentBpm',
      'strokes',
      'parameters',
    ];

    watchProperties.forEach((prop) => this.$watch(prop, () => this.updateController(), { immediate: true, deep: true }));

    window.addEventListener('keyup', (event) => {
      if (event.key === 'Escape') {
        ayva.stop();
      }
    });
  },

  methods: {
    onChange () {
      // Triggered when user clicks a location on slider without dragging...
      if (controller) {
        controller.bpmSliderState.updated = true;
      }
    },

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
        controller.bpmSliderState.active = this.bpmSliderActive;
        controller.bpmSliderState.value = this.currentBpm;
      }
    },

    selectStroke (stroke) {
      this.startController();
      controller.startManualMode(stroke);
      this.mode = 'Manual';
    },

    freePlay () {
      this.startController();
      controller.startFreePlayMode();
      this.mode = 'Free Play';
    },

    getBpm () {
      return Number(this.$refs.bpmSlider.get());
    },

    setBpm (bpm) {
      this.$refs.bpmSlider.set(bpm);
    },

    createBpmAnimation (duration, targetBpm) {
      const startTime = performance.now();
      const endTime = startTime + duration * 1000;
      const startBpm = this.getBpm();

      const updateFrame = () => {
        const currentBpm = Math.round(Ayva.map(performance.now(), startTime, endTime, startBpm, targetBpm));
        this.setBpm(currentBpm);

        this.bpmAnimationFrame = requestAnimationFrame(updateFrame);
      };

      this.bpmAnimationFrame = requestAnimationFrame(updateFrame);
    },

    clearBpmAnimation () {
      cancelAnimationFrame(this.bpmAnimationFrame);
    },

    startController () {
      // TODO: Check if Ayva's current behavior is equal to the controller as well.
      if (!controller) {
        controller = new AyvaController();
        controller.on('transition-start', (duration, targetBpm) => {
          this.createBpmAnimation(duration, targetBpm);
          this.currentStrokeName = 'Transitioning...';
          this.bpmDisabled = true;
        });

        controller.on('transition-end', (stroke, bpm) => {
          this.currentStrokeName = typeof stroke === 'string' ? stroke : 'Custom';
          this.bpmDisabled = false;
          this.clearBpmAnimation();
          if (bpm) {
            this.setBpm(bpm);
          }
        });

        controller.on('update-bpm', (bpm) => {
          this.setBpm(bpm);
        });

        controller.on('update-current-behavior', (name) => {
          this.currentStrokeName = name;
        });

        controller.on('toggle-bpm-enabled', (value) => {
          this.bpmDisabled = !value;
        });

        controller.on('script-error', (scriptName, error) => {
          ayva.stop();
          this.notify.error({
            content: `Exception occurred while running script ${scriptName}:`,
            meta: error.message,
          });
        });

        this.updateController();
        ayva.do(controller);
      }
    },

    home () {
      ayva.stop();
      ayva.home();
    },

    onStop () {
      ayva.stop();
    },

    onAyvaStop () {
      controller = null;
      this.mode = 'Stopped';
      this.currentStrokeName = 'None';
      this.bpmDisabled = false;
      this.clearBpmAnimation();
    },

    requestConnection () {
      this.device.requestConnection().then(() => {
        ayva.addOutput(this.device);
      }).catch((error) => {
        /* Do nothing if no port was selected. */
        console.warn(error); // eslint-disable-line no-console
      });
    },
  },
};
</script>

<style src="./assets/main.css"></style>
