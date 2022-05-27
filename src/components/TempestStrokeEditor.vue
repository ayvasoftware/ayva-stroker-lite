<template>
  <div class="root">
    <div class="header">
      <div class="toolbar">
        <span>{{ edit ? 'Edit' : 'Create' }} Stroke</span>
        <span class="presets" :disabled="disabled">
          <n-dropdown
            placement="bottom-start"
            trigger="click"
            size="small"
            :options="strokeLibraryDropdownOptions"
            @select="selectPreset"
          ><span class="presets-button">{{ presetLabel }}</span>
          </n-dropdown>
          <span class="cycle-buttons">
            <chevron-left-icon class="cycle-button" @click="previousPreset()" />
            <chevron-right-icon class="cycle-button" @click="nextPreset()" />
          </span>
        </span>
      </div>
      <div class="main-inputs" />
    </div>
    <div class="axis-column">
      <div ref="axisScroll" class="axis-scroll">
        <div v-for="axis in axes" :key="axis.name" class="tempest-motion-container">
          <tempest-motion
            v-model="axis.parameters"
            :display-name="axis.displayName"
            :angle="previewAngle"
            :disabled="disabled"
          />
        </div>
      </div>
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
  </div>
</template>

<script>
import Ayva, { TempestStroke } from 'ayvajs';
import OSREmulator from 'osr-emu';
import { h, nextTick } from 'vue';
import AyvaSlider from './widgets/AyvaSlider.vue';
import TempestMotion from './TempestMotion.vue';
import { formatter } from '../lib/util.js';
import Storage from '../lib/ayva-storage.js';
import ChevronLeftIcon from '../assets/icons/chevron-left.svg';
import ChevronRightIcon from '../assets/icons/chevron-right.svg';

const storage = new Storage('custom-tempest-strokes');

const ayva = new Ayva().defaultConfiguration();
let emulator;

export default {
  components: {
    TempestMotion,
    AyvaSlider,
    ChevronLeftIcon,
    ChevronRightIcon,
  },

  props: {
    edit: {
      type: Boolean,
      default: false,
    },
  },

  data () {
    return {
      active: {
        type: Boolean,
        default: true,
      },

      axes: [],

      availableAxes: Ayva.defaultConfiguration.axes.map((axis) => ({
        name: axis.name,
        alias: axis.alias,
        checked: false,
        displayName: `${axis.alias} (${axis.name})`,
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
          max: 120,
        },
        format: formatter(),
      },

      tempestStrokeLibrary: TempestStroke.library,

      customStrokeLibrary: {},

      transitionDuration: 0.75,

      presetIndex: null,

      presetLabel: 'Presets',
    };
  },

  computed: {
    axesByAlias () {
      return (this.axes || []).reduce((map, axis) => {
        map[axis.alias] = axis;
        return map;
      }, {});
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
  },

  beforeMount () {
    this.customStrokeLibrary = storage.load('all') || {};
  },

  mounted () {
    emulator = new OSREmulator(this.$refs.emulator);
    ayva.addOutputDevice(emulator);
    ayva.updateLimits('stroke', 0.25, 0.75);
    ayva.updateLimits('twist', 0.25, 0.75);
    ayva.updateLimits('roll', 0.25, 0.75);
    ayva.updateLimits('pitch', 0.25, 0.75);
  },

  methods: {
    animatePreview () {
      // TODO: Change this to use TempestStroke parameter providers when that feature is available.
      const { granularity } = TempestStroke;
      const seconds = 30 / granularity;
      const angleSlice = Math.PI / granularity;
      const moves = [];

      const emulatorAxes = this.availableAxes.filter((axis) => axis.emulator);

      for (const axis of emulatorAxes) {
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
      const defaultStroke = {
        stroke: { from: 1, to: 0 },
        twist: { from: 0.5, to: 0.5 },
        roll: { from: 0.5, to: 0.5 },
        pitch: { from: 0.5, to: 0.5 },
      };

      const stroke = this.customStrokeLibrary[key] || this.tempestStrokeLibrary[key] || defaultStroke;

      if (stroke) {
        this.presetLabel = item.label;
        this.presetIndex = this.strokeLibraryOptions.findIndex((option) => option.key === key);
        this.active = false;
        this.previewAngle = 0;

        this.$refs.axisScroll.scrollTop = 0;

        nextTick(() => {
          // Perform the transition move on next tick so Ayva has time to stop().
          const axisNames = Object.keys(stroke);

          this.axes = axisNames.map((name) => {
            const parameters = { ...stroke[name] };
            const { alias } = ayva.getAxis(name);

            return {
              alias,
              name,
              parameters,
              displayName: `${alias} (${name})`,
            };
          }).filter((axis) => key === 'default' || !(axis.parameters.from === 0.5 && axis.parameters.to === 0.5));

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
  },
};
</script>

<style scoped>
.root {
  width: 1200px;
  height: 700px;
  display: grid;
  grid-template-columns: 45% 55%;
  grid-template-rows: 1fr 80% 50px;
}

.header {
  grid-column: span 2;
}

.toolbar {
  background-color: rgb(17, 17, 17);
  height: 30px;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
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
  width: 600px;
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
  padding: 0px 10px 20px 10px;
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

.cycle-button {
  width: 25px;
  cursor: pointer;
  margin-top: 2px;
}

.cycle-button:hover {
  opacity: var(--ayva-hover-opacity)
}

.cycle-button:active {
  opacity: var(--ayva-active-opacity);
}
</style>
