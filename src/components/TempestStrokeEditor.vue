<template>
  <div class="root">
    <div class="header">
      <div class="toolbar" />
      <div class="main-inputs" />
    </div>
    <div class="axis-column">
      <div class="axis-scroll">
        <div v-for="axis in axes" :key="axis.name" class="tempest-motion-container">
          <tempest-motion
            v-model="axis.parameters"
            :display-name="axis.displayName"
            :angle="previewAngle"
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
        />
        <div class="label">
          Preview BPM
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Ayva, { TempestStroke } from 'ayvajs';
import OSREmulator from 'osr-emu';
import AyvaSlider from './widgets/AyvaSlider.vue';
import TempestMotion from './TempestMotion.vue';
import { formatter } from '../util.js';

const ayva = new Ayva().defaultConfiguration();
let emulator;

export default {
  components: {
    TempestMotion,
    AyvaSlider,
  },

  props: {
    active: {
      type: Boolean,
      default: true,
    },
  },

  data () {
    return {
      axes: [{
        alias: 'stroke',
        displayName: 'stroke (L0)',
      }, {
        alias: 'twist',
        displayName: 'twist (R0)',
      }, {
        alias: 'roll',
        displayName: 'roll (R1)',
      }, {
        alias: 'pitch',
        displayName: 'pitch (R2)',
      }, {
        alias: 'vibe0',
        displayName: 'vibe0 (V0)',
      }],

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
    };
  },

  computed: {
    axesByAlias () {
      return (this.axes || []).reduce((map, axis) => {
        map[axis.alias] = axis;
        return map;
      }, {});
    },
  },

  watch: {
    active: {
      immediate: true,
      handler (active) {
        this.$nextTick(() => {
          if (active) {
            ayva.stop();
            this.animatePreview();
          } else {
            ayva.stop();
          }
        });
      },
    },
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
  },
};
</script>

<style scoped>
.root {
  min-width: 1200px;
  min-height: 700px;
  display: grid;
  grid-template-columns: 45% 55%;
  grid-template-rows: 1fr 80% 50px;
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
  top: 550px;
  width: 300px;
  left: 50%;
  transform: translate(-50%);
}

.preview-bpm .label {
  display: flex;
  justify-content: center;
  padding: 4px;
  color: var(--ayva-text-color);
  font-weight: 700;
}
</style>
