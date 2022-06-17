<template>
  <div class="modal-body">
    <div class="header">
      <div class="toolbar">
        <span class="toolbar-left">
          <span>{{ edit ? 'Edit' : 'Create' }} Stroke</span>
        </span>
        <span class="toolbar-right">
          <span class="presets" :disabled="disabled">
            <n-dropdown
              placement="bottom-start"
              trigger="click"
              size="small"
              :options="strokeLibraryDropdownOptions"
              @select="selectPreset"
            ><span class="presets-button">{{ presetLabel }}</span>
            </n-dropdown>
            <span>
              <chevron-left-icon class="icon" @click="previousPreset()" />
              <chevron-right-icon class="icon" @click="nextPreset()" />
            </span>
          </span>
          <span>
            <close-icon class="close icon" @click="$emit('close')" />
          </span>
        </span>
      </div>
      <div class="main-inputs">
        <div class="setup">
          <n-popselect v-model:value="selectedAxes" trigger="click" multiple :options="availableAxes">
            <span class="select-axes">
              <axis-icon class="icon" />Axes
            </span>
          </n-popselect>
        </div>
        <div v-if="device && device.connected" class="device">
          <span>
            <ayva-checkbox id="preview-on-device" v-model="previewOnDevice" />
            <label for="preview-on-device">Send preview to actual device.</label>
          </span>
        </div>
        <div v-else class="device">
          <label disabled>No device connected. Preview only available on emulator.</label>
        </div>
      </div>
    </div>
    <div class="axis-column">
      <n-scrollbar ref="axisScroll" :data-scroll="axisScrollTop" trigger="none">
        <div class="axis-scroll">
          <div v-for="axis in axes" :key="axis.name" class="tempest-motion-container">
            <tempest-motion
              v-model="axis.parameters"
              :display-name="axis.label"
              :angle="previewAngle"
              :disabled="disabled"
            />
          </div>
        </div>
      </n-scrollbar>
    </div>
    <div class="emulator-column">
      <div ref="emulator" class="emulator" />
      <div class="preview-bpm">
        <ayva-slider
          v-model="previewBpm"
          :options="previewBpmOptions"
          :disabled="disabled"
        />
        <div class="label" :disabled="disabled">
          Preview BPM
        </div>
      </div>
    </div>
    <div class="save-container">
      <div>
        <label>Name:</label>
        <input v-model="strokeName" class="name">
        <button class="ayva-button primary">
          Save to Library
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import Ayva, { TempestStroke } from 'ayvajs';
import OSREmulator from 'osr-emu';
import { h, nextTick } from 'vue';
import AyvaSlider from './widgets/AyvaSlider.vue';
import AyvaCheckbox from './widgets/AyvaCheckbox.vue';
import TempestMotion from './TempestMotion.vue';
import { formatter } from '../lib/util.js';
import Storage from '../lib/ayva-storage.js';

const storage = new Storage('custom-tempest-strokes');

const ayva = new Ayva().defaultConfiguration();
let emulator;

const defaultStroke = {
  stroke: {
    from: 0.5, to: 0.5, phase: 0, ecc: 0,
  },
};

export default {
  components: {
    TempestMotion,
    AyvaSlider,
    AyvaCheckbox,
  },

  inject: {
    globalAyva: {
      from: 'globalAyva',
    },

    device: {
      from: 'globalDevice',
    },
  },

  props: {
    edit: {
      type: Boolean,
      default: false,
    },
  },

  emits: ['close'],

  data () {
    return {
      active: {
        type: Boolean,
        default: true,
      },

      axes: this.createAxes('default', defaultStroke),

      availableAxes: Ayva.defaultConfiguration.axes.map((axis) => ({
        ...axis,
        label: `${axis.alias} (${axis.name})`,
        value: axis.name,
        emulator: ['L0', 'R0', 'R1', 'R2'].indexOf(axis.name) !== -1,
      })),

      previewAngle: 0,
      previewBpm: 60,

      previewBpmOptions: {
        start: [60],
        tooltips: true,
        connect: true,
        padding: [10],
        step: 1,
        range: {
          min: 0,
          max: 150,
        },
        format: formatter(),
      },

      tempestStrokeLibrary: TempestStroke.library,

      customStrokeLibrary: {},

      transitionDuration: 0.5,

      presetIndex: 0,

      presetLabel: 'Presets',

      previewOnDevice: false,

      axisScrollTop: 0,

      strokeName: '',
    };
  },

  computed: {
    axesByAlias () {
      return (this.axes || []).reduce((map, axis) => {
        map[axis.alias] = axis;
        return map;
      }, {});
    },

    selectedAxes: {
      get () {
        return this.axes.map((axis) => axis.name);
      },

      set (value) {
        const newAxisSet = new Set(value);
        const oldAxisSet = new Set(this.axes.map((axis) => axis.name));

        const removed = new Set([...oldAxisSet].filter((v) => !newAxisSet.has(v)));

        const oldAxisMap = this.axes.reduce((map, next) => {
          map.set(next.name, next);
          return map;
        }, new Map());

        this.axes = this.availableAxes.filter((axis) => newAxisSet.has(axis.name))
          .map((axis) => {
            const existing = oldAxisMap.get(axis.name);

            if (!existing) {
              const defaultValue = ayva.getAxis(axis.name).type === 'auxiliary' ? 0 : 0.5;

              return this.createAxis(axis.name, {
                from: defaultValue, to: defaultValue, phase: 0, ecc: 0,
              });
            }

            return existing;
          });

        for (const oldAxis of removed) {
          // TODO: Make sure save is disabled if there are no axes selected.
          const defaultValue = ayva.getAxis(oldAxis).type === 'auxiliary' ? 0 : 0.5;

          // Immediately send removed axis to default.
          ayva.$[oldAxis].value = defaultValue;
        }
      },
    },

    tempestStrokeOptions () {
      return Object.keys(this.tempestStrokeLibrary).sort().map((key) => ({
        key,
        label: key,
      }));
    },

    customStrokeOptions () {
      return Object.keys(this.customStrokeLibrary).sort().map((key) => ({
        key,
        label: key,
      }));
    },

    strokeLibraryDropdownOptions () {
      return [{
        key: 'default',
        label: 'Default',
        props: {
          class: 'default-option',
        },
      }, {
        key: 'header',
        type: 'render',
        render: () => h('div', { class: 'stroke-library-heading' }, h('div', {
          disabled: this.customStrokeOptions.length ? undefined : '',
        }, 'Custom')),
      }, ...this.customStrokeOptions, {
        key: 'header',
        type: 'render',
        render: () => h('div', { class: 'stroke-library-heading' }, 'Library'),
      }, ...this.tempestStrokeOptions];
    },

    strokeLibraryOptions () {
      // Dropdown options without the headers.
      return this.strokeLibraryDropdownOptions.filter((option) => option.key !== 'header');
    },

    disabled () {
      // Because we are putting this attribute on non input elements we have
      // to do this hacky thing...
      return this.active ? undefined : '';
    },
  },

  watch: {
    active: {
      immediate: true,
      handler (active) {
        ayva.stop();

        if (active) {
          nextTick(() => {
            this.animatePreview();
          });
        }
      },
    },

    previewOnDevice () {
      if (this.previewOnDevice) {
        ayva.addOutputDevice(this.device);
      } else {
        ayva.removeOutputDevice(this.device);
      }
    },

    'device.connected' (connected) {
      if (!connected) {
        ayva.removeOutputDevice(this.device);
        this.previewOnDevice = false;
      }
    },
  },

  beforeMount () {
    this.customStrokeLibrary = storage.load('all') || {};
  },

  mounted () {
    emulator = new OSREmulator(this.$refs.emulator);
    ayva.addOutputDevice(emulator);

    // Copy all axis limits from global Ayva instance.
    Object.keys(ayva.axes).forEach((name) => {
      ayva.updateLimits(name, this.globalAyva.$[name].min, this.globalAyva.$[name].max);
    });

    window.addEventListener('scroll', this.onAxisScroll, { passive: true, capture: true });
  },

  unmounted () {
    ayva.stop();
    ayva.removeOutputDevice(emulator);
    emulator.destroy();
    window.removeEventListener('scroll', this.onAxisScroll);
  },

  methods: {
    animatePreview () {
      // TODO: Change this to use TempestStroke parameter providers when that feature is available.
      const { granularity } = TempestStroke;
      const seconds = 30 / granularity;
      const angleSlice = Math.PI / granularity;
      const moves = [];

      for (const axis of this.availableAxes) {
        moves.push({
          axis: axis.name,
          value: this.createPreviewValueProvider(axis),
          duration: seconds / this.previewBpm,
        });
      }

      ayva.move(...moves).then((complete) => {
        if (complete) {
          this.previewAngle += angleSlice;

          if (this.active) {
            this.animatePreview();
          }
        }
      });
    },

    createPreviewValueProvider (axis) {
      const tempestMotion = (valueParameters) => {
        const mappedAxis = this.axesByAlias[axis.alias];

        if (mappedAxis && mappedAxis.parameters) {
          const {
            from, to, phase, ecc,
          } = mappedAxis.parameters;
          return Ayva.tempestMotion(
            from,
            to,
            phase,
            ecc,
            this.previewBpm,
            this.previewAngle
          )(valueParameters);
        }

        return null;
      };

      return (valueParameters) => tempestMotion(valueParameters);
    },

    selectPreset (key, item) {
      const stroke = this.customStrokeLibrary[key] || this.tempestStrokeLibrary[key] || defaultStroke;

      if (stroke) {
        this.presetLabel = item.label;
        this.presetIndex = this.strokeLibraryOptions.findIndex((option) => option.key === key);
        this.active = false;
        this.previewAngle = 0;

        this.$refs.axisScroll.scrollTo(0);

        nextTick(() => {
          // Perform the transition move on next tick so Ayva has time to stop().
          this.axes = this.createAxes(key, stroke);
          const resetMoves = this.getResetMoves(stroke);

          ayva.move(...resetMoves).then(() => {
            this.active = true;
          });
        });
      }
    },

    nextPreset () {
      let nextIndex;
      if (this.presetIndex === null) {
        nextIndex = 0;
      } else {
        nextIndex = (this.presetIndex + 1) % this.strokeLibraryOptions.length;
      }

      const selected = this.strokeLibraryOptions[nextIndex];
      this.selectPreset(selected.key, selected);
    },

    previousPreset () {
      let nextIndex;
      if (this.presetIndex === null || this.presetIndex === 0) {
        nextIndex = this.strokeLibraryOptions.length - 1;
      } else {
        nextIndex = this.presetIndex - 1;
      }

      const selected = this.strokeLibraryOptions[nextIndex];
      this.selectPreset(selected.key, selected);
    },

    getResetMoves (stroke) {
      const duration = this.transitionDuration;
      const startMoves = new TempestStroke(stroke).getStartMoves(ayva, { duration });

      const usedAxesSet = startMoves.reduce((set, next) => {
        set.add(next.axis);
        return set;
      }, new Set());

      const unusedAxes = Ayva.defaultConfiguration.axes
        .filter((axis) => !usedAxesSet.has(axis.name) && !usedAxesSet.has(axis.alias));

      const unusedMoves = unusedAxes.map((axis) => {
        const to = axis.type === 'auxiliary' ? 0 : 0.5; // Send unused linear / rotation to 0.5, auxiliary to 0.

        return {
          to, duration, axis: axis.name,
        };
      });

      return [...startMoves, ...unusedMoves];
    },

    createAxes (key, stroke) {
      const axisNames = Object.keys(stroke);

      return axisNames.map((axisName) => {
        const parameters = { ...stroke[axisName] };
        return this.createAxis(axisName, parameters);

        // TODO: Do we also want to filter out auxiliary axes with value zero here?
      }).filter((axis) => key === 'default' || !(axis.parameters.from === 0.5 && axis.parameters.to === 0.5));
    },

    createAxis (axisName, parameters) {
      // Note: axisName might be alias or machine name...
      const { alias, name } = ayva.getAxis(axisName);

      return {
        alias,
        name,
        parameters,
        label: `${alias} (${name})`,
      };
    },

    onAxisScroll () {
      this.axisScrollTop = this.$el.querySelector('.n-scrollbar-container').scrollTop;
    },
  },
};
</script>

<style scoped>
.modal-body {
  width: 1200px;
  height: 700px;
  display: grid;
  grid-template-columns: 45% 55%;
  grid-template-rows: 80px 550px 1fr;
}

.header {
  grid-column: span 2;
  display: grid;
  grid-template-rows: 30px 50px;
}

.toolbar {
  background-color: rgb(17, 17, 17);
  height: 30px;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
}

.toolbar > * {
  display: flex;
}

.toolbar-left {
  align-items: center;
}

[disabled] > * {
  pointer-events: none;
}

.presets {
  display: flex;
  align-items: center;
}

.presets-button:hover {
  opacity: var(--ayva-hover-opacity);
  cursor: pointer;
}

.presets-button:active {
  opacity: var(--ayva-active-opacity);
}

.emulator {
  width: 620px;
  height: 100%;
}

.emulator-column {
  position: relative;
  grid-row: 2;
}

.axis-column {
  grid-row: 2;
}

.axis-scroll {
  height: 100%;
  overflow: scroll;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.tempest-motion-container {
  padding: 0px 10px 19px 10px;
}

.tempest-motion-container:nth-last-child(1) {
  padding-bottom: 0;
}

.preview-bpm {
  display: grid;
  grid-template-rows: 1fr 1fr;
  position: absolute;
  top: 500px;
  width: 300px;
  left: 50%;
  transform: translate(-50%);
}

.preview-bpm .label {
  display: flex;
  justify-content: center;
  padding: 4px;
  color: var(--ayva-text-color-blue);
  font-weight: 700;
}

.close.icon {
  margin-left: 5px;
}

.settings.icon {
  width: 20px;
  margin-top: 5px;
  margin-right: 7.5px;
  outline: none;
}

.main-inputs {
  display: flex;
  justify-content: space-between;
}

.main-inputs > * {
  display: flex;
  align-items: center;
}

.main-inputs .device,
.main-inputs .setup {
  margin-right: 40px;
}

.main-inputs .setup {
  margin-left: 45px;
}

.main-inputs .device label {
  cursor: pointer;
}

.main-inputs .device label[disabled] {
  cursor: not-allowed;
}

.main-inputs .device > span,
.main-inputs .setup > span {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--ayva-text-color-light-gray)
}

input.name {
  width: 200px;
  background: var(--ayva-background-dark);
}

.save-container {
  grid-column: 2;
  display: flex;
  align-items: center;
  height: 100%;
  font-size: 16px;
  color: var(--ayva-text-color-off-white);
  justify-content: end;
}

.save-container input {
  font-size: 12px;
  min-width: 200px;
  height: 30px;
  color: var(--ayva-text-color-light-gray);
  margin-left: 5px;
  padding: 0 5px;
}

.save-container button {
  min-width: 150px;
  margin-left: 10px;
  margin-right: 28px;
}

.save-container div {
  display: flex;
  align-items: center;
}

.select-axes .icon:hover {
  opacity: 1;
}

.select-axes {
  font-size: 14px;
  margin-left: 390px; /* No... */
}

.select-axes:hover:not([disabled]) {
  cursor: pointer;
  opacity: var(--ayva-hover-opacity);
}

.select-axes:active:not([disabled]) {
  opacity: var(--ayva-active-opacity);
}

</style>
