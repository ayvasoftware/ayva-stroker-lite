<template>
  <div
    id="main"
    class="lil-gui"
  >
    <ayva-mode :mode="mode" />

    <ayva-free-play
      :mode="mode"
      :current-stroke-name="currentStrokeName"
      :style="hudStyle"
      @update-parameters="updateParameters"
      @update-strokes="updateStrokes"
      @select-stroke="selectStroke"
    />

    <div
      id="emulator"
      ref="emulator"
      @click="onClickEmulator"
    />

    <ayva-output
      :style="hudStyle"
      :mode="mode"
      @update-limits="updateLimits"
      @request-connection="requestConnection"
      @disconnect="disconnect"
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
        <span>Free Play</span> <span style="font-size: 12px">(Space)</span>
      </button>

      <button
        id="stop"
        :disabled="mode === 'Stopped'"
        @click="stop"
      >
        <span>Stop</span> <span style="font-size: 12px">(Esc)</span>
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

    <ayva-modal :show="showReleaseNotes" lil-gui>
      <ayva-release-notes @close="onCloseReleaseNotes" />
    </ayva-modal>

    <ayva-modal :show="showLicense" lil-gui>
      <ayva-license ref="licenseModal" @close="showLicense = false" />
    </ayva-modal>

    <div class="logo" :style="hudStyle">
      <span>
        <n-dropdown
          ref="appSettingsDropdown"
          placement="bottom-start"
          trigger="click"
          size="small"
          :options="settingsDropdownOptions"
          :disabled="mode !== 'Stopped'"
          @select="onSelectSettings"
        >
          <settings-icon class="app-settings" :disabled="mode !== 'Stopped' ? '' : null" />
        </n-dropdown>
      </span>
      <span ref="logo">Ayva Stroker <span class="ayva">Lite</span>
      </span>
      <span style="margin-left: 2rem">
        <a
          href="https://discord.gg/WKdSFzjdcG"
          target="_blank"
          style="display: flex; color: var(--ayva-blue);"
        >
          <discord-icon style="width: 1.25rem" />
        </a>
      </span>
    </div>
  </div>
</template>

<script>
import OSREmulator from 'osr-emu';
import {
  Ayva, WebSerialDevice, WebSocketDevice, ConsoleDevice, BLEDevice
} from 'ayvajs';
import { computed, h } from 'vue';
import { useNotification } from 'naive-ui';
import { createAyva } from './lib/ayva-config.js';
import AyvaSlider from './components/widgets/AyvaSlider.vue';
import AyvaCheckbox from './components/widgets/AyvaCheckbox.vue';
import AyvaOutput from './components/AyvaOutput.vue';
import AyvaModal from './components/AyvaModal.vue';
import AyvaFreePlay from './components/AyvaFreePlay.vue';
import AyvaMode from './components/AyvaMode.vue';
import AyvaController from './lib/controller.js';
import AyvaReleaseNotes from './components/AyvaReleaseNotes.vue';
import AyvaLicense from './components/AyvaLicense.vue';
import Storage from './lib/ayva-storage';
import PatreonIcon from './assets/icons/patreon.svg';
import { formatter, eventMixin, triggerMouseEvent } from './lib/util.js';
import CustomBehaviorStorage from './lib/custom-behavior-storage';
import settingsStorage from './lib/settings-storage';
import RubjoyBLEDevice from './lib/rubjoy-ble-device.js';

// These need to be "globals" so they aren't proxied by Vue... because issues with private members :(
const ayva = createAyva();

let controller;
let emulator;

export default {

  components: {
    AyvaOutput,
    AyvaFreePlay,
    AyvaMode,
    AyvaSlider,
    AyvaReleaseNotes,
    AyvaLicense,
    AyvaModal,
  },

  provide () {
    return {
      globalAyva: ayva,
      globalDevice: computed(() => this.device),
      globalParameters: computed(() => this.parameters),
      globalEvents: computed(() => this.events),
      modals: computed(() => this.modals),
      deviceType: computed(() => this.deviceType),
      createRubjoyEmulator: computed(() => this.createRubjoyEmulator),
    };
  },

  inject: {
    spinner: {
      from: 'globalSpinner',
    },
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
          max: 200,
        },
        format: formatter(),
      },

      device: new WebSerialDevice(),

      deviceType: null,

      showHud: true,

      showReleaseNotes: false,

      showLicense: false,

      patreonUrl: 'https://patreon.com/soritesparadox',

      eggplantUrl: 'https://www.buymeacoffee.com/soritesparadox',

      events: { ...eventMixin },

      settingsDropdownOptions: [{
        key: 'import',
        label: 'Import Settings',
      }, {
        key: 'export',
        label: 'Export Settings',
      }, {
        key: 'release',
        label: 'Release Notes',
      }, {
        key: 'license',
        label: 'License',
      }, {
        key: 'patreon',
        label: 'Patreon',
      }],

      globalSettings: new Storage('global-settings'),

      modals: {
        count: 0,
      },
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

    deviceType () {
      if (emulator) {
        emulator.destroy();
        ayva.removeOutput(emulator);

        if (this.deviceType === 'RUBJOY') {
          emulator = this.createRubjoyEmulator(this.$refs.emulator);
        } else {
          emulator = new OSREmulator(this.$refs.emulator, { model: this.deviceType });
        }

        ayva.addOutput(emulator);
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

  beforeMount () {
    this.refreshOutputSettings();
  },

  mounted () {
    const watchProperties = [
      'bpmSliderActive',
      'currentBpm',
      'strokes',
      'parameters',
    ];

    watchProperties.forEach((prop) => this.$watch(prop, () => this.updateController(), { immediate: true, deep: true }));

    window.addEventListener('keyup', (event) => {
      const noModals = this.modals.count === 0;

      if (noModals && event.key === 'Escape') {
        this.stop();
      } else if (noModals && event.key === ' ') {
        // Toggle Free Play Mode on Space Click
        if (this.mode === 'Free Play') {
          this.stop();
        } else {
          this.freePlay();
        }
      }
    });

    window.addEventListener('keydown', (event) => {
      const noModals = this.modals.count === 0;

      if (noModals && event.key === ' ') {
        event.preventDefault();
      }
    });

    this.events.on('refresh-output-settings', () => {
      this.refreshOutputSettings();
    });

    emulator = this.deviceType === 'RUBJOY'
      ? this.createRubjoyEmulator(this.$refs.emulator)
      : new OSREmulator(this.$refs.emulator, { model: this.deviceType });

    ayva.addOutput(emulator);

    this.showReleaseNotes = this.globalSettings.load('show-release-notes-1.47.0') ?? true;

    this.patreonPromo();
  },

  methods: {
    onChange () {
      // Triggered when user clicks a location on slider without dragging...
      if (controller) {
        controller.bpmSliderState.updated = true;
      }
    },

    onSelectSettings (key) {
      if (key === 'export') {
        settingsStorage.export();
      } else if (key === 'import') {
        settingsStorage.import().then((success) => {
          if (success) {
            new CustomBehaviorStorage().migrateLegacyStrokes();
            this.spinner.show(new Promise(() => {}));
            window.location.reload();
          }
        });
      } else if (key === 'release') {
        this.showReleaseNotes = true;
      } else if (key === 'license') {
        this.showLicense = true;
      } else if (key === 'patreon') {
        window.open(this.patreonUrl, '_blank').focus();
      }
    },

    onCloseReleaseNotes () {
      this.showReleaseNotes = false;
      this.globalSettings.save('show-release-notes-1.47.0', false);
    },

    onClickEmulator () {
      // Hack to make sure settings dropdown can see click outside event in order to close.
      // For some reason the canvas is swallowing the events.
      triggerMouseEvent(this.$refs.emulator, 'mousedown');
      triggerMouseEvent(this.$refs.emulator, 'mouseup');
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

    stop () {
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
      const promise = this.device.requestConnection().then(() => {
        ayva.addOutput(this.device);
      }).catch((error) => {
        if (error instanceof DOMException) {
          /* For serial connections, do nothing if no port was selected. */
          console.warn(error); // eslint-disable-line no-console
        } else {
          this.notify.error({
            content: error.message,
          });
        }
      });

      this.spinner.show(promise);
    },

    disconnect () {
      ayva.removeOutput(this.device);
      this.device.disconnect();
    },

    refreshOutputSettings () {
      const outputSettingsStorage = new Storage('output-settings');

      const deviceType = outputSettingsStorage.load('deviceType') || 'OSR2';
      const host = outputSettingsStorage.load('host') || 'localhost';
      const port = Number(outputSettingsStorage.load('port') || 80);
      const frequency = Number(outputSettingsStorage.load('frequency') || 50);
      const connectionType = outputSettingsStorage.load('connectionType') || 'serial';

      ayva.frequency = frequency;

      // TODO: This shouldn't happen, but maybe handle case where device is currently connected.
      if (deviceType === 'RUBJOY') {
        this.device = new RubjoyBLEDevice(() => new Promise((resolve) => {
          this.$nextTick(() => resolve(ayva.$.stroke.value));
        }));
      } else if (connectionType === 'websocket') {
        this.device = new WebSocketDevice(host, port);
      } else if (connectionType === 'console') {
        this.device = new ConsoleDevice();
      } else if (connectionType === 'ble') {
        this.device = new BLEDevice();
      } else {
        this.device = new WebSerialDevice();
      }

      this.deviceType = deviceType;
    },

    patreonPromo () {
      const checkboxStorage = new Storage('checkbox-value');
      const resetPromoStorage = new Storage('promo-reset');

      if (!resetPromoStorage.load('patreon')) {
        checkboxStorage.save('patreon-promo-disabled', false);
        resetPromoStorage.save('patreon', true);
      }

      const patreonPromoDisabled = checkboxStorage.load('patreon-promo-disabled');

      if (patreonPromoDisabled) {
        return;
      }

      const patreonStyle = { style: 'color: rgb(255, 66, 77)' };

      setTimeout(() => {
        this.notify.info({
          content: 'Enjoy Ayva Stroker Lite?',
          meta: () => h(
            'div',
            [
              'Support this software by becoming a ',
              h('a', {
                href: this.patreonUrl,
                target: '_blank',
                ...patreonStyle,
              }, 'patron.'),
              h(
                'div',
                { class: 'lil-gui patreon-promo-disable' },
                [
                  h('span', 'Don\'t show this message again.'),
                  h(AyvaCheckbox, {
                    storageKey: 'patreon-promo-disabled',
                  })]
              )]
          ),
          avatar: () => h(PatreonIcon, patreonStyle),
        });
      }, 30000);
    },

    createRubjoyEmulator (element) {
      const indigo = [0.294 * 0.75, 0.0, 0.51 * 0.75];

      const rubjoyEmulator = new OSREmulator(element);
      rubjoyEmulator.osrModel.objects.base.children[0].material.color.fromArray([0.075, 0.075, 0.075]);
      rubjoyEmulator.osrModel.objects.receiver.children[0].material.color.fromArray(indigo);

      return rubjoyEmulator;
    },
  },
};
</script>

<style src="./assets/main.css"></style>
<style>
.ayva-remote-promo {
  position: fixed;
  bottom: 10vh;
  z-index: 1000;
  left: 2vw;
  font-size: 0.75rem;
}
</style>
