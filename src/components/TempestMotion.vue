<template>
  <div class="tempest-motion">
    <div class="range">
      <ayva-slider
        ref="rangeSlider"
        v-model="range"
        :options="rangeOptions"
        active-tooltips
      />
    </div>
    <div class="wave">
      <canvas ref="wave" width="435" height="100" @wheel.prevent="onWheel" />
    </div>

    <div class="display-name">
      <label>{{ displayName }}</label>
    </div>

    <div class="phase">
      <ayva-slider
        ref="phaseSlider"
        v-model="phase"
        :options="phaseOptions"
        active-tooltips
      />
    </div>

    <div class="ecc">
      <ayva-slider
        ref="eccSlider"
        v-model="ecc"
        :options="eccOptions"
        active-tooltips
      />
    </div>
  </div>
</template>

<script>
import Ayva from 'ayvajs';
import _ from 'lodash';
import { nextTick } from 'vue';
import AyvaSlider from './widgets/AyvaSlider.vue';
import { clamp } from '../lib/util.js';

export default {
  components: {
    AyvaSlider,
  },

  props: {
    /**
     * The model value of a TempestMotion is a parameters object with from, to, phase, and ecc properties.
     */
    modelValue: {
      type: Object,
      default: () => ({
        from: 0.5,
        to: 0.5,
        phase: 0,
        ecc: 0,
      }),
    },

    displayName: {
      type: String,
      default: '',
    },

    angle: {
      type: Number,
      default: 0,
    },
  },

  emits: ['update:modelValue'],

  data () {
    return {
      rangeOptions: {
        animate: false,
        range: {
          min: 0,
          max: 1,
        },
        start: [0.5, 0.5],
        orientation: 'vertical',
        direction: 'rtl',
        behaviour: 'unconstrained',
        step: 0.01,
      },
      phaseOptions: {
        range: {
          min: -4,
          max: 4,
        },
        start: [0],
        step: 0.05,
      },
      eccOptions: {
        range: {
          min: -1,
          max: 1,
        },
        start: [0],
        step: 0.05,
      },

      from: 0.5,
      to: 0.5,
      phase: 0,
      ecc: 0,

      lastFromDirection: -1,
      lastToDirection: 1,
    };
  },

  computed: {
    range: {
      get () {
        return [this.from, this.to];
      },

      set (value) {
        [this.from, this.to] = value;
      },
    },
  },

  watch: {
    modelValue: {
      immediate: true,
      deep: true,
      handler (updated) {
        nextTick(() => {
          // TODO: Truly understand why this must be done on the next tick to work...
          const {
            from, to, phase, ecc,
          } = this;

          if (!_.isEqual(updated, {
            from, to, phase, ecc,
          })) {
            const { rangeSlider, phaseSlider, eccSlider } = this.$refs;

            rangeSlider.set(updated.from, updated.to);
            phaseSlider.set(updated.phase);
            eccSlider.set(updated.ecc);
          }
        });
      },
      flush: 'post',
    },

    angle () {
      this.plot();
    },
  },

  mounted () {
    const watchProperties = ['from', 'to', 'phase', 'ecc'];

    watchProperties.forEach((prop) => this.$watch(prop, () => {
      this.plot();
      this.updateModelValue();
    }));
  },

  methods: {
    /**
     * Expand or shrink range on mouse wheel.
     */
    onWheel (event) {
      const zoom = event.deltaY * 0.003;
      const average = (this.from + this.to) / 2;

      const computeLimits = (direction) => (direction > 0 ? { min: 0, max: average } : { min: average, max: 1 });
      const format = (value, limits) => clamp(value, limits.min, limits.max);
      const computeDirection = (value) => {
        const distance = average - value;

        if (distance > 0) {
          return 1;
        } else if (distance < 0) {
          return -1;
        }

        return 0;
      };

      let targetFrom;
      let targetTo;

      const fromDirection = computeDirection(this.from) || this.lastFromDirection;
      const toDirection = computeDirection(this.to) || this.lastToDirection;

      const fromLimits = computeLimits(fromDirection);
      const toLimits = computeLimits(toDirection);

      targetFrom = this.from + zoom * fromDirection;
      targetTo = this.to + zoom * toDirection;

      targetFrom = format(targetFrom, fromLimits);
      targetTo = format(targetTo, toLimits);

      this.$refs.rangeSlider.set(targetFrom, targetTo);

      this.lastFromDirection = fromDirection;
      this.lastToDirection = toDirection;
    },

    /**
     * Plot the sin wav graph.
     */
    plot () {
      const {
        from, to, phase, ecc,
      } = this;

      const fn = (x) => {
        const value = -Math.cos(x + (Math.PI * phase) / 2 + ecc * Math.sin(x + (Math.PI * phase) / 2));

        const upperLimit = Ayva.map(from, 1, 0, 1, -1);
        const lowerLimit = Ayva.map(to, 1, 0, 1, -1);
        return Ayva.map(value, -1, 1, upperLimit, lowerLimit);
      };

      const range = [0, Math.PI * 2, -1, 1];

      const canvas = this.$refs.wave;
      const context = canvas.getContext('2d');
      const { width, height } = canvas;

      const widthScale = (width / (range[1] - range[0]));
      const heightScale = ((height - 12) / (range[3] - range[2]));

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.beginPath();

      let firstPoint = true;
      for (let x = 0; x < width; x++) {
        const xFnVal = (x / widthScale) - range[0];
        let yGVal = (fn(xFnVal) - range[2]) * heightScale;

        yGVal = height - 6 - yGVal;

        if (firstPoint) {
          context.moveTo(x, yGVal);
          firstPoint = false;
        } else {
          context.lineTo(x, yGVal);
        }
      }

      context.lineCap = 'round';
      context.setLineDash([3, 3]);
      context.strokeStyle = 'rgb(138, 99, 131)';
      context.lineWidth = 2;
      context.stroke();
      context.closePath();

      // Plot angle.
      const angleScale = (this.angle % (Math.PI * 2)) / (Math.PI * 2);
      const x = angleScale * width;
      const y = height - 6 - (fn((x / widthScale) - range[0]) - range[2]) * heightScale;

      context.beginPath();
      context.arc(x, y, 4, 0, 2 * Math.PI);
      context.fillStyle = 'rgb(138, 99, 131)'; // '#6784bb';
      context.fill();
    },

    updateModelValue () {
      const {
        from, to, phase, ecc,
      } = this;
      this.$emit('update:modelValue', {
        from, to, phase, ecc,
      });
    },
  },
};
</script>

<style scoped>
  .tempest-motion {
    display: grid;
    grid-template-columns: 15px 60px 1fr 20px 1fr;
    grid-template-rows: 100px 20px;
    width: 450px;
  }

  .tempest-motion[disabled] > * {
    pointer-events: none;
  }

  .wave {
    grid-column: 2 / span 4;
  }

  .phase {
    grid-column: 3;
  }

  .ecc {
    grid-column: 5;
  }

  .display-name {
    grid-column: 1 / span 2;
  }

  .display-name > label {
    position: relative;
    left: -15px;
    bottom: -3px;
    color: #6784bb;
    font-size: 12px;
  }

  .range .slider {
    top: 6px;
    left: 6px;
    height: 89%;
  }

  .wave canvas {
    background-color: rgb(25,25,25)
  }
</style>
