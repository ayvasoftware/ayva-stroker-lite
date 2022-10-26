<template>
  <div class="modal-body" @mouseover="onHover">
    <div class="header" hover-info="">
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
          <span class="context-clue">{{ contextClue }}</span>

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
    <div ref="axisScrollParent" class="axis-column">
      <n-scrollbar ref="axisScroll" :data-scroll="axisScrollTop" trigger="none">
        <div class="axis-scroll">
          <div v-for="axis in axes" :key="axis.name" class="tempest-motion-container">
            <tempest-motion
              v-model="axis.parameters"
              :display-name="axis.label"
              :angle="previewAngle"
              :disabled="disabled"
              :scroll-element="axisScrollElement"
            />
          </div>
        </div>
      </n-scrollbar>
    </div>
    <div class="emulator-column" hover-info="">
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
    <div class="save-container" hover-info="">
      <div>
        <label>Name:</label>
        <n-tooltip :show="strokeNameDuplicate" class="error-tooltip">
          <template #trigger>
            <input v-model="strokeName" class="name" :class="strokeNameDuplicate ? 'error' : ''">
          </template>
          A behavior with that name already exists.
        </n-tooltip>
        <button class="ayva-button primary" :disabled="!strokeNameValid" @click="save">
          {{ saveText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { Ayva, TempestStroke } from 'ayvajs';
import OSREmulator from 'osr-emu';
import { h, nextTick } from 'vue';
import { ayvaConfig, createAyva } from '../lib/ayva-config.js';
import AyvaSlider from './widgets/AyvaSlider.vue';
import AyvaCheckbox from './widgets/AyvaCheckbox.vue';
import TempestMotion from './TempestMotion.vue';
import { formatter, validNumber } from '../lib/util.js';
import CustomBehaviorStorage from '../lib/custom-behavior-storage.js';

const customBehaviorStorage = new CustomBehaviorStorage();
const ayva = createAyva();
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
    editStroke: {
      type: String,
      default: null,
    },
  },

  emits: ['close', 'save'],

  data () {
    return {
      active: {
        type: Boolean,
        default: true,
      },

      axes: this.createAxes('default', defaultStroke),

      availableAxes: ayvaConfig.axes.map((axis) => ({
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

      customBehaviorLibrary: {},

      transitionDuration: 0.5,

      presetIndex: 0,

      presetLabel: 'Presets',

      previewOnDevice: false,

      axisScrollTop: 0,

      strokeName: '',

      contextClue: '',

      contextClueTimeout: null,

      axisScrollElement: null,
    };
  },

  computed: {
    edit () {
      return !!this.editStroke;
    },

    saveText () {
      return this.edit ? 'Save' : 'Add to Library';
    },

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

    strokeNameDuplicate () {
      if (this.editStroke && this.strokeName === this.editStroke) {
        return false;
      }

      return !!this.tempestStrokeLibrary[this.strokeName] || !!this.customBehaviorLibrary[this.strokeName];
    },

    strokeNameValid () {
      return this.strokeName.length && !this.strokeNameDuplicate && !this.strokeNameReserved;
    },

    strokeNameReserved () {
      return this.strokeName === 'default' || this.strokeName === 'header';
    },

    customStrokeLibrary () {
      const result = {};

      Object.entries(this.customBehaviorLibrary).forEach(([name, entry]) => {
        if (entry.type === 'tempest-stroke') {
          result[name] = entry.data;
        }
      });

      return result;
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
        ayva.addOutput(this.device);
      } else {
        ayva.removeOutput(this.device);
        this.resetGlobalDevicePosition();
      }
    },

    'device.connected' (connected) {
      if (!connected) {
        ayva.removeOutput(this.device);
        this.previewOnDevice = false;
      }
    },

    strokeName (value) {
      this.strokeName = value.replaceAll(/[^a-zA-Z0-9-]/g, '').toLowerCase();
    },
  },

  beforeMount () {
    this.customBehaviorLibrary = customBehaviorStorage.load();
  },

  mounted () {
    emulator = new OSREmulator(this.$refs.emulator);
    ayva.addOutput(emulator);

    // Copy all axis limits from global Ayva instance.
    Object.keys(ayva.axes).forEach((name) => {
      ayva.updateLimits(name, this.globalAyva.$[name].min, this.globalAyva.$[name].max);
    });

    window.addEventListener('scroll', this.onAxisScroll, { passive: true, capture: true });

    if (this.editStroke) {
      this.strokeName = this.editStroke;

      const item = this.strokeLibraryOptions.find((option) => option.key === this.editStroke);
      this.selectPreset(this.editStroke, item);
    }

    this.axisScrollElement = this.$refs.axisScrollParent;
  },

  unmounted () {
    ayva.stop();
    ayva.removeOutput(emulator);
    ayva.removeOutput(this.device);
    emulator.destroy();
    window.removeEventListener('scroll', this.onAxisScroll);

    if (this.previewOnDevice) {
      this.resetGlobalDevicePosition();
    }
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
            from, to, phase, ecc, motion, $current,
          } = mappedAxis.parameters;

          const result = (motion || Ayva.tempestMotion)(
            $current?.from || from,
            $current?.to || to,
            phase,
            ecc,
            this.previewBpm,
            this.previewAngle
          )(valueParameters);

          if ($current && mappedAxis.parameters.noise) {
            this.generateNoise(mappedAxis.parameters);
          }

          return result;
        }

        return null;
      };

      return (valueParameters) => tempestMotion(valueParameters);
    },

    generateNoise (params) {
      // TODO: This is basically a rip from Ayva.js. In the future do not reimplement this.
      //       Use TempestStroke somehow...
      const { PI } = Math;
      const angleSlice = PI / TempestStroke.granularity;
      const deg = (radians) => (radians * 180) / PI;
      const getNoise = (which) => (validNumber(params.noise) ? params.noise : params.noise[which] || 0);
      const phaseAngle = (params.phase * PI) / 2;
      const absoluteAngle = phaseAngle + this.previewAngle;

      const startDegrees = Math.round(deg(absoluteAngle % (PI * 2)));
      const endDegrees = Math.round(startDegrees + deg(angleSlice));
      const movingToStart = startDegrees < 360 && endDegrees >= 360;
      const movingToMid = startDegrees < 180 && endDegrees >= 180;

      if (movingToStart) {
        const noise = getNoise('to');
        const noiseRange = (params.from - params.to) / 2;
        params.$current.to = params.to + noise * noiseRange * Math.random();
      } else if (movingToMid) {
        const noise = getNoise('from');
        const noiseRange = (params.to - params.from) / 2;
        params.$current.from = params.from + noise * noiseRange * Math.random();
      }
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

      const unusedAxes = ayvaConfig.axes
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

      parameters.$current = {
        from: parameters.from,
        to: parameters.to,
      };

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

    onHover (event) {
      const infoElement = event.path.find((element) => element.hasAttribute && element.hasAttribute('hover-info'));

      if (infoElement) {
        this.contextClue = infoElement.getAttribute('hover-info');
      }
    },

    save () {
      if (this.editStroke) {
        customBehaviorStorage.delete(this.editStroke);
      }
      const stroke = this.axes.reduce((obj, axis) => {
        obj[axis.name] = axis.parameters;
        delete obj[axis.name].$current;

        return obj;
      }, {});

      customBehaviorStorage.save(this.strokeName, 'tempest-stroke', stroke);
      this.$emit('close');
      this.$emit('save');
    },

    resetGlobalDevicePosition () {
      for (const axis in ayva.$) { // eslint-disable-line guard-for-in
        this.globalAyva.$[axis].value = ayva.$[axis].value;
      }
    },
  },
};
</script>

<style src="../assets/ayva-modal.css" scoped></style>
